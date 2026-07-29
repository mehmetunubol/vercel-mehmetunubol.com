import { ApiError, GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Free-tier models to try, in priority order. Each has its own daily quota
// (see isDailyQuotaError below), so when the primary model's quota is
// exhausted, calls fall back to the next one instead of failing outright.
// Override with GEMINI_MODELS="model-a,model-b" (comma-separated, priority
// first) without a code change or redeploy of this file.
const DEFAULT_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"];

function configuredModels(): string[] {
  const raw = process.env.GEMINI_MODELS;
  if (!raw) return DEFAULT_MODELS;
  const parsed = raw
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_MODELS;
}

/**
 * The model the next Gemini call will use — the first configured model whose
 * daily quota isn't currently exhausted, recomputed every call (rather than
 * a persisted pointer) so a model that was exhausted yesterday is tried
 * again first once its quota resets, instead of the app getting stuck on
 * whatever fallback it last switched to.
 */
export function getActiveGeminiModel(): string | null {
  return configuredModels().find((model) => !isModelExhaustedForToday(model)) ?? null;
}

function isRateLimitError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

// The SDK folds the raw API error body into `error.message` (see
// `@google/genai`'s error handling) rather than exposing it as a typed
// field. A 429 body includes a RetryInfo entry like `"retryDelay":"38s"` —
// pull that out and use it verbatim instead of guessing a backoff, since
// the server is telling us exactly how long the current quota window has
// left.
function retryDelayMsFromError(error: unknown): number | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
  return match ? Number(match[1]) * 1000 : null;
}

// Free-tier Flash's quota is a hard 20-requests-per-day cap
// (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`), not a per-minute
// one — confirmed from the actual 429 body's quotaId. The `retryDelay` a
// daily-quota 429 reports (observed: ~57s) reflects some internal check
// interval, not when the daily quota actually resets — retrying after it
// just 429s again. So once this specific quota is hit, don't retry within
// this call, and remember it process-wide until the next UTC day so every
// later call (across every feature) fails fast without wasting a request
// that's certain to be rejected anyway.
function isDailyQuotaError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("GenerateRequestsPerDayPerProjectPerModel");
}

function nextUtcMidnight(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}

// Each model has its own daily quota, so exhaustion is tracked per model
// rather than as a single process-wide flag.
const dailyQuotaExhaustedUntil = new Map<string, number>();

function isModelExhaustedForToday(model: string): boolean {
  const until = dailyQuotaExhaustedUntil.get(model);
  return until !== undefined && Date.now() < until;
}

/** Lets callers show a specific "try again tomorrow" message instead of a generic failure. */
export function isGeminiQuotaExhaustedForToday(): boolean {
  return getActiveGeminiModel() === null;
}

// Every Gemini caller in this app (manual match, cover letter draft, CV
// parsing, and each job scored inside auto-match's loop) funnels through
// this one function, so a single process-wide "last call" timestamp is
// enough to throttle across all of them — not just calls within the same
// loop. Without this, a manual click landing shortly after another Gemini
// call (from auto-match, another tab, or another manual action) hits the
// same free-tier per-minute quota window and 429s immediately, with no
// memory of that recent call to space around.
const MIN_GAP_MS = 4000;
let lastCallAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForThrottleSlot(): Promise<void> {
  const wait = lastCallAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

// Free-tier models are prone to transient failures under load — 503
// overload responses and plain network timeouts alike — and to hitting
// their requests-per-minute quota (429). A 429 means "already over quota
// this window," so it backs off using the server's own `retryDelay` when
// given, falling back to a much longer backoff than a transient
// 503/network error would get; anything else keeps the short backoff. A 429
// against a model's daily quota instead switches to the next configured
// model (see isDailyQuotaError()) and retries immediately rather than
// backing off — a different model has its own separate quota.
//
// `fn` receives the active model name so callers don't hardcode one.
// `attempts` bounds transient-error retries on top of switching through
// every configured model on daily-quota errors, so it defaults relative to
// how many models are configured rather than a flat number.
export async function withGeminiRetry<T>(
  fn: (model: string) => Promise<T>,
  attempts = configuredModels().length + 2,
): Promise<T | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const model = getActiveGeminiModel();
    if (!model) {
      console.error("Gemini daily quota already exhausted on every configured model — skipping call.");
      return null;
    }

    await waitForThrottleSlot();
    try {
      return await fn(model);
    } catch (error) {
      if (isDailyQuotaError(error)) {
        dailyQuotaExhaustedUntil.set(model, nextUtcMidnight());
        console.error(`Gemini daily quota exhausted for ${model}, trying next configured model:`, error);
        continue;
      }
      if (attempt === attempts) {
        console.error("Gemini call failed after retries:", error);
        return null;
      }
      const retryDelayMs = isRateLimitError(error) ? retryDelayMsFromError(error) : null;
      const backoffMs = retryDelayMs ?? (isRateLimitError(error) ? attempt * 8000 : attempt * 1500);
      await sleep(backoffMs);
    }
  }
  return null;
}
