import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { applications, jobs, matches, profiles, syncStatus, trackedBoards } from "@/lib/db/schema";
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

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [jobRows, applicationRows, profileRows, matchRows, boards, aggregatorSyncs] = userId
    ? await Promise.all([
        db.select({ id: jobs.id }).from(jobs),
        db.select().from(applications).where(eq(applications.userId, userId)),
        db.select().from(profiles).where(eq(profiles.userId, userId)),
        db.select().from(matches),
        db.select().from(trackedBoards).orderBy(desc(trackedBoards.createdAt)),
        db.select().from(syncStatus),
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
  ];

  const activeApplications = applicationRows.filter(
    (application) => application.status !== "rejected" && application.status !== "offer",
  ).length;

  const stats = [
    { label: "Tracked jobs", value: jobRows.length },
    { label: "Active applications", value: activeApplications },
    { label: "Profiles saved", value: profileRows.length },
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-4">
              <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted">{stat.label}</p>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync status</CardTitle>
            <CardDescription>Last sync time per target — boards and aggregators.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {syncTargets.map((target) => (
              <div
                key={target.label}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {target.label} {target.paused ? <Badge variant="default">paused</Badge> : null}
                </span>
                <span className="shrink-0 tabular-nums text-muted">{formatSyncTime(target.lastSyncedAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/jobs">
            <Card className="h-full transition-colors hover:border-accent/40">
              <CardHeader>
                <CardTitle>Jobs</CardTitle>
                <CardDescription>Track boards, sync aggregators, paste postings.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/applications">
            <Card className="h-full transition-colors hover:border-accent/40">
              <CardHeader>
                <CardTitle>Applications</CardTitle>
                <CardDescription>Kanban board across every application status.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/preferences">
            <Card className="h-full transition-colors hover:border-accent/40">
              <CardHeader>
                <CardTitle>Search preferences</CardTitle>
                <CardDescription>Keywords and locations that drive filtering and auto-match.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
