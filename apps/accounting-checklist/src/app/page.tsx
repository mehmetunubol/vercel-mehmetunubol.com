import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import Link from "next/link";

const linkButtonBase =
  "inline-flex items-center justify-center gap-2 rounded-md bg-accent font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const FEATURES = [
  {
    title: "Checklists for recurring processes",
    body: "Set up as many recurring monthly checklists as you need — each with its own steps, fields, and file uploads. Switch between them with a tab.",
  },
  {
    title: "Month by month",
    body: "Jump to any month with the picker. Configure defaults once and they pre-fill every upcoming month automatically.",
  },
  {
    title: "Backed by your Google Drive",
    body: "No database — every value, uploaded file, and generated summary lives in a folder in your own Drive, organized by checklist and month.",
  },
  {
    title: "Printable monthly summary",
    body: "One click generates a Google Doc summary per month — checklist status, field values, and a totals section — ready to print or download as PDF.",
  },
];

export default function MarketingPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
              A
            </div>
            <h1 className="truncate text-sm font-semibold leading-tight">Accounting Checklist</h1>
          </div>
          <Link href="/login" className={`${linkButtonBase} h-8 px-3 text-sm`}>
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="space-y-4 text-center sm:text-left">
          <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
            A personal monthly bookkeeping checklist, backed by Google Drive.
          </h2>
          <p className="text-base text-muted sm:text-lg">
            Recurring monthly checklists with configurable defaults, printable summaries, and
            file uploads — all stored in your own Drive. No shared database, no third party
            storing your numbers.
          </p>
          <div className="flex justify-center sm:justify-start">
            <Link href="/login" className={`${linkButtonBase} h-12 px-6 text-base`}>
              Sign in with Google
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-12 sm:mt-16">
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted sm:p-12">
            Screenshots coming soon — this is a single-user personal tool, gated behind Google
            sign-in.
          </div>
        </section>
      </main>
    </div>
  );
}
