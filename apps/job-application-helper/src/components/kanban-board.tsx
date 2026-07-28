"use client";

import { Badge, Card } from "@repo/ui";
import Link from "next/link";
import { useState, useTransition } from "react";

export interface KanbanApplication {
  id: string;
  status: string;
  jobId: string;
  jobTitle: string;
  jobCompany: string;
}

export interface KanbanColumn {
  status: string;
  label: string;
  dotClassName: string;
}

export function KanbanBoard({
  columns,
  applications,
  moveAction,
}: {
  columns: KanbanColumn[];
  applications: KanbanApplication[];
  moveAction: (applicationId: string, status: string) => Promise<{ ok: boolean }>;
}) {
  // Optimistic overrides keyed by application id, layered over the server
  // props during render — once `applications` reflects the new status (after
  // revalidatePath re-renders the parent), the override becomes a no-op. No
  // effect needed to "sync" state from props; it's derived every render.
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const items = applications.map((application) => {
    const overrideStatus = overrides[application.id];
    return overrideStatus && overrideStatus !== application.status
      ? { ...application, status: overrideStatus }
      : application;
  });

  function move(applicationId: string, nextStatus: string) {
    const current = items.find((item) => item.id === applicationId);
    if (!current || current.status === nextStatus) return;
    const previousStatus = current.status;

    setError(null);
    setOverrides((prev) => ({ ...prev, [applicationId]: nextStatus }));

    startTransition(async () => {
      try {
        const result = await moveAction(applicationId, nextStatus);
        if (!result.ok) throw new Error("update rejected");
      } catch {
        setOverrides((prev) => ({ ...prev, [applicationId]: previousStatus }));
        setError("Couldn't update status — try again.");
      }
    });
  }

  const byStatus = columns.map((column) => ({
    ...column,
    items: items.filter((item) => item.status === column.status),
  }));

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {byStatus.map((column) => (
          <div
            key={column.status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(column.status);
            }}
            onDragLeave={() => setDragOverStatus((current) => (current === column.status ? null : current))}
            onDrop={(e) => {
              e.preventDefault();
              const applicationId = e.dataTransfer.getData("text/plain");
              setDragOverStatus(null);
              if (applicationId) move(applicationId, column.status);
            }}
            className={`flex min-w-0 flex-col gap-2 rounded-lg border p-3 transition-colors ${
              dragOverStatus === column.status ? "border-accent bg-accent/5" : "border-border bg-background"
            }`}
          >
            <div className="flex items-center gap-2 px-1">
              <span className={`h-2 w-2 shrink-0 rounded-full ${column.dotClassName}`} />
              <h2 className="text-sm font-medium capitalize">{column.label}</h2>
              <Badge variant="outline" className="ml-auto tabular-nums">
                {column.items.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {column.items.map((application) => (
                <Card
                  key={application.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", application.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingId(application.id);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  className={`cursor-grab p-3 text-sm transition-colors hover:border-accent/40 active:cursor-grabbing ${
                    draggingId === application.id ? "opacity-40" : ""
                  }`}
                >
                  <Link href={`/jobs/${application.jobId}`} className="font-medium hover:underline">
                    {application.jobTitle}
                  </Link>
                  <p className="truncate text-xs text-muted">{application.jobCompany}</p>
                  <StatusPicker
                    // Remounts (resetting the local `selected` state below)
                    // whenever the confirmed status changes, instead of an
                    // effect syncing state from a prop.
                    key={application.status}
                    status={application.status}
                    columns={columns}
                    onUpdate={(status) => move(application.id, status)}
                  />
                </Card>
              ))}
              {column.items.length === 0 ? <p className="px-1 text-xs text-muted">Empty. Drag a card here.</p> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPicker({
  status,
  columns,
  onUpdate,
}: {
  status: string;
  columns: KanbanColumn[];
  onUpdate: (status: string) => void;
}) {
  const [selected, setSelected] = useState(status);

  return (
    <div className="mt-2 flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-xs transition-colors focus:border-accent focus:outline-none"
      >
        {columns.map((column) => (
          <option key={column.status} value={column.status}>
            {column.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onUpdate(selected)}
        disabled={selected === status}
        className="h-auto shrink-0 rounded-md px-2 py-1 text-xs text-foreground transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-neutral-800"
      >
        Update
      </button>
    </div>
  );
}
