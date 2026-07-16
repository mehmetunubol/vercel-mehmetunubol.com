"use client";

import { useState } from "react";
import { Button } from "@repo/ui";

export function PostActions({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled the native share sheet — nothing to do.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        ⬇️ Download PDF
      </Button>
      <Button variant="outline" size="sm" onClick={handleShare}>
        {copied ? "✅ Link copied" : "🔗 Share"}
      </Button>
    </div>
  );
}
