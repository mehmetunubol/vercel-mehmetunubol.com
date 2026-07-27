import { Button } from "@repo/ui";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { searchPreferences } from "@/lib/db/schema";

function parseList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function savePreferences(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const keywords = parseList(formData.get("keywords"));
  const excludeKeywords = parseList(formData.get("excludeKeywords"));
  const locations = parseList(formData.get("locations"));
  const remoteOnly = formData.get("remoteOnly") === "on";

  await db
    .insert(searchPreferences)
    .values({ userId, keywords, excludeKeywords, locations, remoteOnly })
    .onConflictDoUpdate({
      target: searchPreferences.userId,
      set: { keywords, excludeKeywords, locations, remoteOnly, updatedAt: new Date() },
    });

  revalidatePath("/preferences");
  revalidatePath("/jobs");
}

export default async function PreferencesPage() {
  const userId = await requireUserId();
  const [prefs] = userId
    ? await db.select().from(searchPreferences).where(eq(searchPreferences.userId, userId)).limit(1)
    : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-lg font-semibold">Search preferences</h1>
      <p className="text-sm text-muted">
        Jobs are filtered against this list on the Jobs page, and new matches are
        auto-scored against your latest profile whenever you sync.
      </p>

      <form action={savePreferences} className="space-y-3 rounded-lg border border-border p-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Keywords (comma-separated, must match at least one)</span>
          <input
            name="keywords"
            defaultValue={prefs?.keywords.join(", ") ?? ""}
            placeholder="e.g. staff engineer, platform, backend"
            className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Exclude keywords (comma-separated)</span>
          <input
            name="excludeKeywords"
            defaultValue={prefs?.excludeKeywords.join(", ") ?? ""}
            placeholder="e.g. unpaid, internship"
            className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Locations (comma-separated)</span>
          <input
            name="locations"
            defaultValue={prefs?.locations.join(", ") ?? ""}
            placeholder="e.g. Berlin, Istanbul"
            className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remoteOnly" defaultChecked={prefs?.remoteOnly ?? false} />
          Remote only
        </label>

        <Button type="submit" size="sm">
          Save preferences
        </Button>
      </form>
    </main>
  );
}
