import { Badge, Card } from "@repo/ui";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationStatusEnum, applications } from "@/lib/db/schema";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";

const STATUSES = applicationStatusEnum.enumValues;

const STATUS_DOT: Record<(typeof STATUSES)[number], string> = {
  discovered: "bg-neutral-400 dark:bg-neutral-500",
  matched: "bg-sky-500",
  drafted: "bg-amber-500",
  ready: "bg-accent",
  applied: "bg-blue-500",
  interviewing: "bg-violet-500",
  rejected: "bg-red-500",
  offer: "bg-emerald-500",
};

async function updateStatus(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  if (!userId) return;

  const applicationId = formData.get("applicationId");
  const status = formData.get("status");
  if (typeof applicationId !== "string" || typeof status !== "string") return;
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return;

  await db
    .update(applications)
    .set({ status: status as (typeof STATUSES)[number], updatedAt: new Date() })
    .where(eq(applications.id, applicationId));

  revalidatePath("/applications");
}

export default async function ApplicationsPage() {
  const userId = await requireUserId();
  const rows = userId
    ? await db.query.applications.findMany({
        where: eq(applications.userId, userId),
        with: { job: true },
        orderBy: (applications, { desc }) => [desc(applications.updatedAt)],
      })
    : [];

  const byStatus = STATUSES.map((status) => ({
    status,
    items: rows.filter((row) => row.status === status),
  }));

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-muted">{rows.length} tracked, across every stage.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {byStatus.map(({ status, items }) => (
            <div key={status} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2 px-1">
                <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
                <h2 className="text-sm font-medium capitalize">{status}</h2>
                <Badge variant="outline" className="ml-auto tabular-nums">
                  {items.length}
                </Badge>
              </div>

              <div className="space-y-2">
                {items.map((application) => (
                  <Card key={application.id} className="p-3 text-sm transition-colors hover:border-accent/40">
                    <Link href={`/jobs/${application.jobId}`} className="font-medium hover:underline">
                      {application.job?.title ?? "Untitled job"}
                    </Link>
                    <p className="truncate text-xs text-muted">{application.job?.company}</p>
                    <form action={updateStatus} className="mt-2 flex items-center gap-2">
                      <input type="hidden" name="applicationId" value={application.id} />
                      <select
                        name="status"
                        defaultValue={application.status}
                        className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-xs transition-colors focus:border-accent focus:outline-none"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <SubmitButton size="sm" variant="ghost" className="h-auto shrink-0 px-2 py-1 text-xs" pendingText="…">
                        Update
                      </SubmitButton>
                    </form>
                  </Card>
                ))}
                {items.length === 0 ? <p className="px-1 text-xs text-muted">Empty.</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
