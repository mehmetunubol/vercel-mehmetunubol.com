import { Badge, Card, Reveal, Shell } from "@repo/ui";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionHeading } from "@/components/section-heading";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <Shell header={<SiteHeader />} footer={<SiteFooter />}>
      <div className="flex flex-col gap-28 sm:gap-36">
        <HeroSection />
        <ExperienceSection />
        <SkillsSection />
        <ContactSection />
      </div>
    </Shell>
  );
}

function HeroSection() {
  return (
    <section id="about" className="scroll-mt-24 pt-6 sm:pt-10">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-6">
          <Reveal>
            <Badge variant="accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Available for opportunities
            </Badge>
          </Reveal>

          <Reveal delayMs={80}>
            <p className="font-mono text-sm text-muted">
              <span className="text-accent">const</span> role ={" "}
              <span className="text-foreground">&quot;{site.title}&quot;</span>
            </p>
          </Reveal>

          <Reveal delayMs={140}>
            <h1 className="text-gradient text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              {site.name}
            </h1>
          </Reveal>

          <Reveal delayMs={200}>
            <p className="max-w-xl text-lg leading-relaxed text-muted">{site.summary}</p>
          </Reveal>

          <Reveal delayMs={260}>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={`mailto:${site.email}`}
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground shadow-lg shadow-transparent transition-shadow duration-300 hover:shadow-accent/40"
              >
                Get in touch
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </a>
              <a
                href="https://www.linkedin.com/in/mehmet-unubol"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                LinkedIn
              </a>
            </div>
          </Reveal>

          <Reveal delayMs={320}>
            <p className="pt-2 font-mono text-xs text-muted">
              <span className="text-accent">@</span> {site.location} &nbsp;·&nbsp;{" "}
              <a href={`mailto:${site.email}`} className="transition-colors hover:text-foreground">
                {site.email}
              </a>
            </p>
          </Reveal>
        </div>

        <Reveal delayMs={200} className="lg:justify-self-end">
          <CodeCard />
        </Reveal>
      </div>
    </section>
  );
}

function CodeCard() {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-[var(--color-surface)] shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
        <span className="h-3 w-3 rounded-full bg-green-400/80" />
        <span className="ml-2 font-mono text-xs text-muted">developer.ts</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[0.8rem] leading-relaxed">
        <code>
          <span className="text-accent">const</span>{" "}
          <span className="text-foreground">engineer</span> = {"{"}
          {"\n"}
          {"  "}name: <span className="text-emerald-400">&quot;{site.name}&quot;</span>,{"\n"}
          {"  "}role: <span className="text-emerald-400">&quot;{site.title}&quot;</span>,{"\n"}
          {"  "}stack: [
          {site.skills.slice(0, 3).map((skill, index) => (
            <span key={skill}>
              <span className="text-emerald-400">&quot;{skill}&quot;</span>
              {index < 2 ? ", " : ""}
            </span>
          ))}
          ],{"\n"}
          {"  "}location: <span className="text-emerald-400">&quot;{site.location}&quot;</span>,{"\n"}
          {"  "}available: <span className="text-accent">true</span>,{"\n"}
          {"}"};
          <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-accent" />
        </code>
      </pre>
    </div>
  );
}

function ExperienceSection() {
  return (
    <section id="experience" className="flex scroll-mt-24 flex-col gap-10">
      <SectionHeading index="01" title="Experience" />
      <div className="relative flex flex-col gap-3 border-l border-border pl-6 sm:pl-8">
        {site.experience.map((job, index) => (
          <Reveal key={`${job.company}-${job.period}`} delayMs={index * 70} className="group relative">
            <span className="absolute -left-[1.85rem] top-2 h-3 w-3 rounded-full border-2 border-background bg-border transition-colors group-hover:bg-accent sm:-left-[2.35rem]" />
            <div className="rounded-lg border border-border bg-[var(--color-surface)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{job.role}</span>
                  <span className="text-sm text-muted">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ""}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted">{job.period}</span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function SkillsSection() {
  return (
    <section id="skills" className="flex scroll-mt-24 flex-col gap-10">
      <SectionHeading index="02" title="Skills" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {site.skills.map((skill, index) => (
          <Reveal key={skill} delayMs={index * 60}>
            <div className="group flex items-center gap-3 rounded-lg border border-border bg-[var(--color-surface)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40">
              <span className="font-mono text-xs text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-sm font-medium">{skill}</span>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Reveal>
          <Card className="h-full border-border bg-[var(--color-surface)]">
            <div className="flex flex-col gap-5 p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-accent">Education</h3>
              <div className="flex flex-col gap-5">
                {site.education.map((edu) => (
                  <div key={edu.degree} className="flex flex-col gap-1">
                    <span className="font-medium">{edu.degree}</span>
                    <span className="text-sm text-muted">{edu.school}</span>
                    <span className="font-mono text-xs text-muted">{edu.period}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal delayMs={120}>
          <Card className="h-full border-border bg-[var(--color-surface)]">
            <div className="flex flex-col gap-5 p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-accent">
                Certifications
              </h3>
              <ul className="flex flex-col gap-3 text-sm text-muted">
                {site.certifications.map((cert) => (
                  <li key={cert} className="flex gap-2.5">
                    <span aria-hidden className="mt-1 text-accent">
                      &#9656;
                    </span>
                    <span>{cert}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-[var(--color-surface)] p-8 sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl"
          />
          <div className="relative flex flex-col gap-4">
            <span className="font-mono text-xs text-accent">03 / contact</span>
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Let&rsquo;s build something reliable.
            </h2>
            <p className="max-w-xl text-lg text-muted">
              Open to back-end and full-stack roles, collaborations, and interesting problems. The
              fastest way to reach me is email.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <a
                href={`mailto:${site.email}`}
                className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 font-mono text-sm font-medium text-accent-foreground shadow-lg shadow-transparent transition-shadow duration-300 hover:shadow-accent/40"
              >
                {site.email}
              </a>
              {site.socials
                .filter((social) => social.href.startsWith("http"))
                .map((social) => (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-medium transition-colors hover:border-accent/40"
                  >
                    {social.label}
                  </a>
                ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
