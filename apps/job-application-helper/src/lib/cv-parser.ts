import { z } from "zod";
import { GEMINI_MODEL, gemini, withGeminiRetry } from "@/lib/gemini";
import { profileDataSchema, type ProfileData } from "@/lib/profile-schema";

const responseSchema = z.toJSONSchema(profileDataSchema);

export async function parseCvPdf(base64: string): Promise<ProfileData | null> {
  const response = await withGeminiRetry(() =>
    gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: base64 } },
            {
              text: "Extract this CV/resume into structured profile data: name, title, summary, skills, experience (company/role/period/location/summary/highlights/tech), education (school/degree/period), projects, languages, certifications. Use the source document's own wording — don't invent content that isn't there.",
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
  const parsed = profileDataSchema.safeParse(JSON.parse(response.text));
  return parsed.success ? parsed.data : null;
}
