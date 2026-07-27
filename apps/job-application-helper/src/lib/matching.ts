import { z } from "zod";
import { GEMINI_MODEL, gemini, withGeminiRetry } from "@/lib/gemini";
import type { ProfileData } from "@/lib/profile-schema";

export const matchRationaleSchema = z.object({
  aligned: z.array(z.string()),
  gaps: z.array(z.string()),
  summary: z.string(),
});

export type MatchRationale = z.infer<typeof matchRationaleSchema>;

const responseSchema = z.toJSONSchema(
  z.object({
    score: z.number().min(0).max(100),
    aligned: z.array(z.string()),
    gaps: z.array(z.string()),
    summary: z.string(),
  }),
);

export async function matchJobToProfile(
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  profile: ProfileData,
): Promise<{ score: number; rationale: MatchRationale } | null> {
  const response = await withGeminiRetry(() =>
    gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Score how well this candidate profile matches the job posting below, from 0-100. List aligned strengths, gaps/missing requirements, and a one-paragraph summary.

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
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    }),
  );

  if (!response?.text) return null;
  const parsed = JSON.parse(response.text) as { score: number; aligned: string[]; gaps: string[]; summary: string };
  const rationale = matchRationaleSchema.safeParse(parsed);
  if (!rationale.success) return null;

  return { score: parsed.score, rationale: rationale.data };
}
