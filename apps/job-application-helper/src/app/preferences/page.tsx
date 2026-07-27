import { Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { searchPreferences } from "@/lib/db/schema";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";

const inputClass =
  "w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm transition-colors focus:border-accent focus:outline-none";

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
    <AppShell>
      <div className="max-w-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Search preferences</h1>
          <p className="text-sm text-muted">
            Jobs are filtered against this list on the Jobs page, and new matches are
            auto-scored against your latest profile whenever you sync.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your list</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={savePreferences} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Keywords</span>
                <span className="block text-xs text-muted">Comma-separated, must match at least one.</span>
                <input
                  name="keywords"
                  defaultValue={prefs?.keywords.join(", ") ?? ""}
                  placeholder="e.g. staff engineer, platform, backend"
                  className={inputClass}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Exclude keywords</span>
                <span className="block text-xs text-muted">Comma-separated, drops any match.</span>
                <input
                  name="excludeKeywords"
                  defaultValue={prefs?.excludeKeywords.join(", ") ?? ""}
                  placeholder="e.g. unpaid, internship"
                  className={inputClass}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Locations</span>
                <span className="block text-xs text-muted">Comma-separated, ignored if remote-only is on.</span>
                <input
                  name="locations"
                  defaultValue={prefs?.locations.join(", ") ?? ""}
                  placeholder="e.g. Berlin, Istanbul"
                  className={inputClass}
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="remoteOnly"
                  defaultChecked={prefs?.remoteOnly ?? false}
                  className="h-4 w-4 rounded border-border accent-accent"
                />
                Remote only
              </label>

              <SubmitButton size="sm" pendingText="Saving…">
                Save preferences
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        {prefs && (prefs.keywords.length > 0 || prefs.excludeKeywords.length > 0 || prefs.locations.length > 0) ? (
          <div className="flex flex-wrap gap-2">
            {prefs.keywords.map((keyword) => (
              <Badge key={`k-${keyword}`} variant="accent">
                {keyword}
              </Badge>
            ))}
            {prefs.excludeKeywords.map((keyword) => (
              <Badge key={`x-${keyword}`} variant="outline" className="text-red-500">
                −{keyword}
              </Badge>
            ))}
            {prefs.locations.map((location) => (
              <Badge key={`l-${location}`} variant="default">
                {location}
              </Badge>
            ))}
            {prefs.remoteOnly ? <Badge variant="default">remote only</Badge> : null}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
