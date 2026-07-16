"use client";

import { useEffect, useId, useState } from "react";

type RenderState =
  | { status: "loading" }
  | { status: "ready"; svg: string }
  | { status: "error" };

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [state, setState] = useState<RenderState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, theme: "dark" });
        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled) setState({ status: "ready", svg });
      })
      .catch((err) => {
        console.error("Failed to render mermaid diagram", err);
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (state.status === "error") {
    return (
      <div className="rounded-md border border-border bg-neutral-100 dark:bg-neutral-800 p-4 text-sm text-muted">
        Diagram could not be rendered.
      </div>
    );
  }

  if (state.status === "loading") {
    return <div className="h-40 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />;
  }

  return (
    <div
      className="overflow-x-auto rounded-md bg-neutral-100 p-4 dark:bg-neutral-800"
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}
