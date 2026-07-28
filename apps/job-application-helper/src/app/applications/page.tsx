import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationStatusEnum, applications } from "@/lib/db/schema";
import { AppShell } from "@/components/app-shell";
import { KanbanBoard, type KanbanApplication, type KanbanColumn } from "@/components/kanban-board";

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

const COLUMNS: KanbanColumn[] = STATUSES.map((status) => ({
  status,
  label: status,
  dotClassName: STATUS_DOT[status],
}));

// Callable directly from the client kanban board (drag-and-drop, or the
// per-card status dropdown) — not FormData-based like a plain form action.
async function updateApplicationStatus(applicationId: string, status: string): Promise<{ ok: boolean }> {
  "use server";
  const userId = await requireUserId();
  if (!userId) return { ok: false };
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { ok: false };

  await db
    .update(applications)
    .set({ status: status as (typeof STATUSES)[number], updatedAt: new Date() })
    .where(eq(applications.id, applicationId));

  revalidatePath("/applications");
  return { ok: true };
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

  const kanbanApplications: KanbanApplication[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    jobId: row.jobId,
    jobTitle: row.job?.title ?? "Untitled job",
    jobCompany: row.job?.company ?? "",
  }));

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-muted">
            {rows.length} tracked, across every stage. Drag a card between columns, or use the dropdown on a card.
          </p>
        </div>

        <KanbanBoard columns={COLUMNS} applications={kanbanApplications} moveAction={updateApplicationStatus} />
      </div>
    </AppShell>
  );
}
