import { Card, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { applications, jobs, matches, profiles } from "@/lib/db/schema";
import { AppShell } from "@/components/app-shell";

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [jobRows, applicationRows, profileRows, matchRows] = userId
    ? await Promise.all([
        db.select({ id: jobs.id }).from(jobs),
        db.select().from(applications).where(eq(applications.userId, userId)),
        db.select().from(profiles).where(eq(profiles.userId, userId)),
        db.select().from(matches),
      ])
    : [[], [], [], []];

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
