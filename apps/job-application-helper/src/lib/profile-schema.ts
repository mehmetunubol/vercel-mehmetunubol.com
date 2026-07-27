import { z } from "zod";

// Shape stored in profiles.data (jsonb), for both fetched-from-web and
// uploaded-CV profiles, and for what matching/cover-letter generation reads.
export const profileDataSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      period: z.string(),
      location: z.string().optional(),
      summary: z.string().optional(),
      highlights: z.array(z.string()).optional(),
      tech: z.array(z.string()).optional(),
    }),
  ),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string(),
      period: z.string().optional(),
    }),
  ),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        tech: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
});

export type ProfileData = z.infer<typeof profileDataSchema>;
