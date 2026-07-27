import { GEMINI_MODEL, gemini, withGeminiRetry } from "@/lib/gemini";
import type { ProfileData } from "@/lib/profile-schema";

export async function generateCoverLetter(
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  profile: ProfileData,
): Promise<string | null> {
  const response = await withGeminiRetry(() =>
    gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Write a tailored cover letter for this candidate applying to the job below. Use the candidate's actual experience and skills — don't invent anything not in their profile. Keep it concise (3-4 paragraphs), professional, and specific to this role. Output only the letter text, no subject line or preamble.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

JOB POSTING:
Title: ${jobTitle}
Company: ${jobCompany}
Description:
${jobDescription}`,
            },
          ],
        },
      ],
    }),
  );

  return response?.text ?? null;
}
