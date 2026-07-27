import { NextResponse } from "next/server";
import { site } from "@/lib/site";

// Structured CV data for job-application-helper to fetch/parse against.
// Everything returned here is already public (site + downloadable CV) — the
// shared-secret check is defense-in-depth against casual scraping, not
// access control over sensitive data.
export async function GET(request: Request) {
  const secret = request.headers.get("x-profile-secret");
  if (!process.env.PROFILE_API_SECRET || secret !== process.env.PROFILE_API_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const {
    name,
    title,
    resumeTitle,
    location,
    summary,
    skills,
    skillGroups,
    experience,
    education,
    projects,
    languages,
    certifications,
  } = site;

  return NextResponse.json(
    {
      name,
      title,
      resumeTitle,
      location,
      summary,
      skills,
      skillGroups,
      experience,
      education,
      projects,
      languages,
      certifications,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
