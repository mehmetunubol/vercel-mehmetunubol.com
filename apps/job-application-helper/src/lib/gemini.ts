import { ApiError, GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Free-tier Flash model — cheap/fast, appropriate for extraction and
// matching tasks. Revisit if quality needs outgrow the free tier.
export const GEMINI_MODEL = "gemini-3.5-flash";

function isRateLimitError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

// Free-tier Flash is prone to transient failures under load — 503 overload
// responses and plain network timeouts alike — and to hitting its low
// requests-per-minute quota (429) whenever several calls fire close
// together (e.g. auto-match scoring a batch of jobs). A 429 means "already
// over quota this window," so it backs off much longer than a transient
// 503/network error before retrying; anything else keeps the short backoff.
export async function withGeminiRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === attempts) {
        console.error("Gemini call failed after retries:", error);
        return null;
      }
      const backoffMs = isRateLimitError(error) ? attempt * 8000 : attempt * 1500;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  return null;
}
