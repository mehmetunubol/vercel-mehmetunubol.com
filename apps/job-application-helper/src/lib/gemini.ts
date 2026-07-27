import { GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Free-tier Flash model — cheap/fast, appropriate for extraction and
// matching tasks. Revisit if quality needs outgrow the free tier.
export const GEMINI_MODEL = "gemini-3.5-flash";

// Free-tier Flash is prone to transient failures under load — 503 overload
// responses and plain network timeouts alike. Retry any failure with
// backoff; only give up (return null) after the last attempt.
export async function withGeminiRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === attempts) {
        console.error("Gemini call failed after retries:", error);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  return null;
}
