import { ApiError, GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Free-tier Flash model — cheap/fast, appropriate for extraction and
// matching tasks. Revisit if quality needs outgrow the free tier.
export const GEMINI_MODEL = "gemini-3.5-flash";

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

// Free-tier Flash is prone to transient failures under load — 503 overload
// responses and plain network timeouts alike — and to hitting its low
// requests-per-minute quota (429). A 429 means "already over quota this
// window," so it backs off using the server's own `retryDelay` when given,
// falling back to a much longer backoff than a transient 503/network error
// would get; anything else keeps the short backoff.
export async function withGeminiRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await waitForThrottleSlot();
    try {
      return await fn();
    } catch (error) {
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
