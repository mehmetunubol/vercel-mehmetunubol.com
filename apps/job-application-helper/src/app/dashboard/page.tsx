import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { applications, jobs, linkedinSavedSearches, matches, syncStatus, trackedBoards } from "@/lib/db/schema";
import { AppShell } from "@/components/app-shell";

function formatSyncTime(date: Date | null): string {
  if (!date) return "never";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

/** Dot + text color for a sync target — lets a stale target stand out from a fresh one at a glance. */
function syncFreshness(date: Date | null, paused: boolean): { dot: string; text: string } {
  if (paused) return { dot: "bg-muted/40", text: "text-muted" };
  if (!date) return { dot: "bg-red-500", text: "text-red-500" };

  const diffHours = (Date.now() - date.getTime()) / 3_600_000;
  if (diffHours < 24) return { dot: "bg-accent", text: "text-muted" };
  if (diffHours < 72) return { dot: "bg-amber-500", text: "text-amber-500" };
  return { dot: "bg-red-500", text: "text-red-500" };
}

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [jobRows, applicationRows, matchRows, boards, aggregatorSyncs, savedSearches] = userId
    ? await Promise.all([
        db.select({ id: jobs.id }).from(jobs),
        db.select().from(applications).where(eq(applications.userId, userId)),
        db.select().from(matches),
        db.select().from(trackedBoards).orderBy(desc(trackedBoards.createdAt)),
        db.select().from(syncStatus),
        db.select().from(linkedinSavedSearches).orderBy(desc(linkedinSavedSearches.createdAt)),
      ])
    : [[], [], [], [], [], []];

  const aggregatorSyncMap = new Map(aggregatorSyncs.map((row) => [row.id, row.lastSyncedAt]));
  const syncTargets = [
    ...boards.map((board) => ({
      label: `${board.companyName} (${board.source})`,
      lastSyncedAt: board.lastFetchedAt,
      paused: !board.active,
    })),
    {
      label: "RemoteOK",
      lastSyncedAt: aggregatorSyncMap.get("aggregator:remoteok") ?? null,
      paused: false,
    },
    {
      label: "Arbeitnow",
      lastSyncedAt: aggregatorSyncMap.get("aggregator:arbeitnow") ?? null,
      paused: false,
    },
    ...savedSearches.map((search) => ({
      label: `${search.name} (LinkedIn)`,
      lastSyncedAt: search.lastRunAt,
      paused: !search.active,
    })),
  ];

  const activeApplications = applicationRows.filter(
    (application) => application.status !== "rejected" && application.status !== "offer",
  ).length;

  const stats = [
    { label: "Tracked jobs", value: jobRows.length },
    { label: "Active applications", value: activeApplications },
    { label: "Matches scored", value: matchRows.length },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted">
            Job intake, CV matching, and cover-letter drafting in one place — you still click submit.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="border-l-2 border-l-accent/50 p-4 transition-colors hover:border-l-accent"
            >
              <p className="text-3xl font-semibold tabular-nums">{stat.value}</p>
              <p className="mt-1 text-[11px] font-medium tracking-wide text-muted uppercase">{stat.label}</p>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync status</CardTitle>
            <CardDescription>Last sync time per target — boards and aggregators.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {syncTargets.map((target) => {
              const freshness = syncFreshness(target.lastSyncedAt, target.paused);
              return (
                <div
                  key={target.label}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${freshness.dot}`} aria-hidden="true" />
                    {target.label} {target.paused ? <Badge variant="default">paused</Badge> : null}
                  </span>
                  <span className={`shrink-0 tabular-nums ${freshness.text}`}>{formatSyncTime(target.lastSyncedAt)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/jobs" className="group">
            <Card className="h-full transition-colors group-hover:border-accent/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 group-hover:text-accent">
                  Jobs <span aria-hidden="true">→</span>
                </CardTitle>
                <CardDescription>Track boards, sync aggregators, paste postings.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/applications" className="group">
            <Card className="h-full transition-colors group-hover:border-accent/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 group-hover:text-accent">
                  Applications <span aria-hidden="true">→</span>
                </CardTitle>
                <CardDescription>Kanban board across every application status.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/preferences" className="group">
            <Card className="h-full transition-colors group-hover:border-accent/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 group-hover:text-accent">
                  Search preferences <span aria-hidden="true">→</span>
                </CardTitle>
                <CardDescription>Keywords and locations that drive filtering and auto-match.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
