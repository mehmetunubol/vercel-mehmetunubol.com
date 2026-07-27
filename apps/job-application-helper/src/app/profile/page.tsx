import { Button } from "@repo/ui";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseCvPdf } from "@/lib/cv-parser";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

async function fetchFromWeb() {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const webUrl = process.env.APPS_WEB_URL;
  const secret = process.env.PROFILE_API_SECRET;
  if (!webUrl || !secret) return;

  const upstream = await fetch(`${webUrl}/api/profile`, {
    headers: { "x-profile-secret": secret },
    cache: "no-store",
  });
  if (!upstream.ok) return;
  const data = await upstream.json();

  await db.insert(profiles).values({
    userId,
    source: "fetched_web",
    label: `Fetched from site ${new Date().toISOString().slice(0, 10)}`,
    data,
  });
  revalidatePath("/profile");
}

async function uploadCv(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const file = formData.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") return;

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const data = await parseCvPdf(base64);
  if (!data) return;

  await db.insert(profiles).values({
    userId,
    source: "uploaded_cv",
    label: file.name,
    rawFileName: file.name,
    data,
  });
  revalidatePath("/profile");
}

export default async function ProfilePage() {
  const userId = await requireUserId();
  const userProfiles = userId
    ? await db.select().from(profiles).where(eq(profiles.userId, userId)).orderBy(desc(profiles.createdAt))
    : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-lg font-semibold">Profile</h1>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Fetch from mehmetunubol.com</h2>
        <form action={fetchFromWeb}>
          <Button type="submit" size="sm">
            Fetch profile
          </Button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Upload a CV (PDF)</h2>
        <form action={uploadCv} className="flex gap-2">
          <input type="file" name="file" accept="application/pdf" required className="text-sm" />
          <Button type="submit" size="sm">
            Upload &amp; parse
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Saved profiles</h2>
        {userProfiles.length === 0 ? (
          <p className="text-sm text-muted">No profiles yet.</p>
        ) : (
          <ul className="space-y-2">
            {userProfiles.map((profile) => (
              <li key={profile.id} className="rounded-md border border-border p-3 text-sm">
                <span className="font-medium">{profile.label}</span>{" "}
                <span className="text-muted">({profile.source})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
