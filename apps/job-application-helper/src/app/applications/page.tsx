import { eq } from "drizzle-orm";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationStatusEnum, applications } from "@/lib/db/schema";

const STATUSES = applicationStatusEnum.enumValues;

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
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-lg font-semibold">Applications</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {byStatus.map(({ status, items }) => (
          <section key={status} className="space-y-2 rounded-lg border border-border p-3">
            <h2 className="text-sm font-medium capitalize">
              {status} ({items.length})
            </h2>
            <ul className="space-y-2">
              {items.map((application) => (
                <li key={application.id} className="space-y-2 rounded-md border border-border p-2 text-sm">
                  <Link href={`/jobs/${application.jobId}`} className="font-medium hover:underline">
                    {application.job?.title ?? "Untitled job"}
                  </Link>
                  <p className="text-muted">{application.job?.company}</p>
                  <form action={updateStatus} className="flex items-center gap-2">
                    <input type="hidden" name="applicationId" value={application.id} />
                    <select
                      name="status"
                      defaultValue={application.status}
                      className="rounded-md border border-border bg-transparent px-2 py-1 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="text-xs text-accent underline">
                      Update
                    </button>
                  </form>
                </li>
              ))}
              {items.length === 0 ? <p className="text-xs text-muted">Empty.</p> : null}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
