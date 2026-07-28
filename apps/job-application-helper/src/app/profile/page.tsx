import { Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseCvPdf } from "@/lib/cv-parser";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { AppShell } from "@/components/app-shell";
import { ActionForm, type ActionResult } from "@/components/action-form";

async function fetchFromWeb(_prevState: ActionResult | null, _formData: FormData): Promise<ActionResult> {
  "use server";
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: "Not signed in." };

  const webUrl = process.env.APPS_WEB_URL;
  const secret = process.env.PROFILE_API_SECRET;
  if (!webUrl || !secret) {
    return { ok: false, message: "APPS_WEB_URL or PROFILE_API_SECRET isn't configured." };
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${webUrl}/api/profile`, {
      headers: {
        "x-profile-secret": secret,
        "User-Agent": "job-application-helper (internal profile sync)",
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: `Couldn't reach ${webUrl} — is apps/web running?` };
  }
  if (!upstream.ok) {
    const hint =
      upstream.status === 403
        ? " (likely Cloudflare blocking the server-to-server request, not our code — check Cloudflare's security events for mehmetunubol.com)"
        : "";
    return { ok: false, message: `mehmetunubol.com returned ${upstream.status}.${hint}` };
  }
  const data = await upstream.json();

  await db.insert(profiles).values({
    userId,
    source: "fetched_web",
    label: `Fetched from site ${new Date().toISOString().slice(0, 10)}`,
    data,
  });
  revalidatePath("/profile");
  return { ok: true };
}

async function uploadCv(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  "use server";
  const userId = await requireUserId();
  if (!userId) return { ok: false, message: "Not signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return { ok: false, message: "Choose a PDF file first." };
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const data = await parseCvPdf(base64);
  if (!data) {
    return { ok: false, message: "Couldn't parse that PDF (Gemini error or quota limit) — try again." };
  }

  await db.insert(profiles).values({
    userId,
    source: "uploaded_cv",
    label: file.name,
    rawFileName: file.name,
    data,
  });
  revalidatePath("/profile");
  return { ok: true };
}

export default async function ProfilePage() {
  const userId = await requireUserId();
  const userProfiles = userId
    ? await db.select().from(profiles).where(eq(profiles.userId, userId)).orderBy(desc(profiles.createdAt))
    : [];

  return (
    <AppShell>
      <div className="max-w-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted">
            The most recent profile below is what matching and cover-letter drafting use.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fetch from mehmetunubol.com</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={fetchFromWeb} submitLabel="Fetch profile" pendingText="Fetching…" size="sm" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload a CV (PDF)</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm
                action={uploadCv}
                submitLabel="Upload & parse"
                pendingText="Parsing…"
                size="sm"
                className="flex flex-col items-start gap-2"
              >
                <input
                  type="file"
                  name="file"
                  accept="application/pdf"
                  required
                  className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-accent-foreground"
                />
              </ActionForm>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted">Saved profiles — {userProfiles.length}</h2>
          {userProfiles.length === 0 ? (
            <p className="text-sm text-muted">No profiles yet.</p>
          ) : (
            <ul className="space-y-2">
              {userProfiles.map((profile, index) => (
                <li
                  key={profile.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
                >
                  <span className="min-w-0 truncate font-medium">{profile.label}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {index === 0 ? <Badge variant="accent">latest</Badge> : null}
                    <Badge variant="outline">{profile.source}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
