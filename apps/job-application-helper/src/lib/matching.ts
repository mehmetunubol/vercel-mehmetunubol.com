import { z } from "zod";
import { gemini, withGeminiRetry } from "@/lib/gemini";
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
  jobLocation?: string | null,
): Promise<{ score: number; rationale: MatchRationale } | null> {
  // ProfileData has no candidate-location field (only per-experience-entry
  // locations, which describe past jobs, not where the candidate lives
  // today) — hardcoded per the user's own statement of where they're based
  // and unable to self-fund relocation from.
  const candidateLocation = "Turkey";

  const response = await withGeminiRetry((model) =>
    gemini.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Score how well this candidate profile matches the job posting below, from 0-100. List aligned strengths, gaps/missing requirements, and a one-paragraph summary.

LOCATION IS A HARD FILTER, not just a nice-to-have: the candidate is based in ${candidateLocation} and cannot relocate on their own. Before scoring skills/experience fit, work out whether the candidate could actually take this job:
- If the posting is remote (fully remote, or remote within a region/timezone that includes ${candidateLocation}), location is not a blocker — score on merit as usual.
- If the posting is onsite/hybrid in a location other than ${candidateLocation}, check whether it explicitly offers visa sponsorship or relocation support. If it does NOT (which is the common case when relocation isn't mentioned), this job is not realistically applyable regardless of skill match — cap the score at 15 and say so plainly in "gaps" and the summary, even if the candidate's skills are a perfect match.
- If the posting is onsite/hybrid in or near ${candidateLocation}, location is not a blocker — score on merit as usual.
- If the posting's location/remote policy is genuinely unclear from the text, treat it as a moderate risk (not a hard cap) and say so in "gaps" rather than guessing.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

JOB POSTING:
Title: ${jobTitle}
Company: ${jobCompany}
Location: ${jobLocation?.trim() || "not specified"}
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
