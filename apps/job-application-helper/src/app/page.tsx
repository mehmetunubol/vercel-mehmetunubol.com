import { Badge, Button, Card, Footer, Header, Shell } from "@repo/ui";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const features = [
  {
    title: "Pull from everywhere",
    description:
      "Track Greenhouse and Lever boards by company, or sync RemoteOK and Arbeitnow — every posting lands in one list.",
  },
  {
    title: "Filtered by your list",
    description:
      "Set keywords, exclusions, and locations once. Only postings that match your list show up — no scrolling through noise.",
  },
  {
    title: "Scored against your CV",
    description:
      "Upload a CV or pull your profile from mehmetunubol.com. Gemini scores each filtered posting and explains the fit.",
  },
  {
    title: "Cover letters, drafted",
    description: "One click drafts a cover letter from the job and your profile — you still review and send it.",
  },
  {
    title: "You still click submit",
    description: "No auto-apply, no bot traffic on job boards. This tool prepares everything; a human applies.",
  },
  {
    title: "Track every stage",
    description: "A kanban board across discovered, matched, drafted, applied, interviewing, rejected, and offer.",
  },
];

const screenshots = [
  { src: "/screenshots/dashboard.png", alt: "Dashboard with tracked job, application, and match counts" },
  { src: "/screenshots/jobs.png", alt: "Jobs page with recommended matches and preference-filtered list" },
  { src: "/screenshots/applications.png", alt: "Applications kanban board across every status" },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <Shell
      header={
        <Header
          brand={
            <Link href="/" className="flex items-center gap-2 font-mono text-sm">
              <span className="grid h-6 w-6 place-items-center rounded bg-accent text-xs font-bold text-accent-foreground">
                J
              </span>
              <span className="font-semibold tracking-tight">job helper</span>
            </Link>
          }
          actions={
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          }
        />
      }
      footer={
        <Footer>
          <span>A personal tool, not a public product — source lives in the mehmetunubol.com monorepo.</span>
        </Footer>
      }
    >
      <div className="space-y-16 py-4">
        <div className="space-y-5">
          <Badge variant="accent">Personal job-search assistant</Badge>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Find, filter, and score job postings against your CV — apply only where it fits.
          </h1>
          <p className="max-w-xl text-base text-muted">
            Job boards move fast and reward volume over fit. This tool pulls postings from the
            sources I actually track, narrows them to a configured list, and scores whatever is left
            against my CV with Gemini — so the only postings I see are ones worth a real
            application.
          </p>
          <div className="flex gap-3 pt-1">
            <Link href="/login">
              <Button>Sign in →</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="p-5">
              <h2 className="text-sm font-medium">{feature.title}</h2>
              <p className="mt-1.5 text-sm text-muted">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold tracking-tight">Inside the app</h2>
          <div className="space-y-8">
            {screenshots.map((screenshot) => (
              <div
                key={screenshot.src}
                className="overflow-hidden rounded-lg border border-border shadow-card"
              >
                <Image
                  src={screenshot.src}
                  alt={screenshot.alt}
                  width={1440}
                  height={960}
                  className="w-full outline outline-1 -outline-offset-1 outline-white/10"
                  priority={screenshot.src === "/screenshots/dashboard.png"}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
