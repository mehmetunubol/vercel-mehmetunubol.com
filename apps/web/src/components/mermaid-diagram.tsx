"use client";

import { useEffect, useId, useState } from "react";

type RenderState =
  | { status: "loading" }
  | { status: "ready"; svg: string }
  | { status: "error" };

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [state, setState] = useState<RenderState>({ status: "loading" });
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomed]);

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
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        title="Click to zoom"
        className="w-full cursor-zoom-in overflow-x-auto rounded-md bg-neutral-100 p-4 text-left dark:bg-neutral-800 print:cursor-auto"
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />

      {zoomed ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-6 print:hidden"
        >
          <div
            className="max-h-full max-w-full overflow-auto rounded-md bg-white p-6"
            dangerouslySetInnerHTML={{ __html: state.svg }}
          />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close"
            className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      ) : null}
    </>
  );
}
