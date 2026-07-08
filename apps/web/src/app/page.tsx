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
        <ProjectsSection />
        <ContactSection />
      </div>
    </Shell>
  );
}

function HeroSection() {
  return (
    <section id="about" className="scroll-mt-24 pt-6 sm:pt-10">
      <div className="grid min-w-0 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
          <Reveal className="min-w-0">
            <Badge variant="accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Available for opportunities
            </Badge>
          </Reveal>

          <Reveal delayMs={80} className="min-w-0">
            <p className="break-words font-mono text-sm text-muted">
              <span className="text-accent">const</span> role ={" "}
              <span className="text-foreground">&quot;{site.title}&quot;</span>
            </p>
          </Reveal>

          <Reveal delayMs={140} className="min-w-0">
            <h1 className="text-gradient text-4xl font-bold leading-[1.05] tracking-tight break-words sm:text-5xl lg:text-6xl">
              {site.name}
            </h1>
          </Reveal>

          <Reveal delayMs={200} className="min-w-0">
            <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              {site.summary}
            </p>
          </Reveal>

          <Reveal delayMs={260} className="min-w-0">
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

          <Reveal delayMs={320} className="min-w-0">
            <p className="break-words pt-2 font-mono text-xs text-muted">
              <span className="text-accent">@</span> {site.location}
              <span className="mx-1.5">·</span>
              <a href={`mailto:${site.email}`} className="transition-colors hover:text-foreground">
                {site.email}
              </a>
            </p>
          </Reveal>
        </div>

        <Reveal delayMs={200} className="min-w-0 w-full lg:justify-self-end">
          <CodeCard />
        </Reveal>
      </div>
    </section>
  );
}

function CodeCard() {
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-[var(--color-surface)] shadow-card sm:max-w-md">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
        <span className="h-3 w-3 rounded-full bg-green-400/80" />
        <span className="ml-2 font-mono text-xs text-muted">developer.ts</span>
      </div>
      <pre className="max-w-full overflow-x-auto p-4 font-mono text-[0.72rem] leading-relaxed sm:p-5 sm:text-[0.8rem]">
        <code className="block whitespace-pre">
          <span className="text-accent">const</span>{" "}
          <span className="text-foreground">engineer</span> = {"{"}
          {"\n"}
          {"  "}name: <span className="text-emerald-400">&quot;{site.name}&quot;</span>,{"\n"}
          {"  "}role: <span className="text-emerald-400">&quot;{site.title}&quot;</span>,{"\n"}
          {"  "}stack: [{"\n"}
          {site.skills.map((skill) => (
            <span key={skill}>
              {"    "}
              <span className="text-emerald-400">&quot;{skill}&quot;</span>,{"\n"}
            </span>
          ))}
          {"  "}],{"\n"}
          {"  "}location: <span className="text-emerald-400">&quot;{site.location}&quot;</span>,
          {"\n"}
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
        {site.experience.map((job, index) => {
          const hasDetails = Boolean(job.summary || job.highlights || job.tech);
          return (
            <Reveal
              key={`${job.company}-${job.period}`}
              delayMs={index * 70}
              className="group relative"
            >
              <span className="absolute -left-[1.85rem] top-2 h-3 w-3 rounded-full border-2 border-background bg-border transition-colors group-hover:bg-accent sm:-left-[2.35rem]" />
              <div
                tabIndex={hasDetails ? 0 : undefined}
                className="rounded-lg border border-border bg-[var(--color-surface)] p-5 outline-none transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 focus-visible:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{job.role}</span>
                      {job.tag ? (
                        <Badge variant="outline" className="px-2 py-0 text-[0.65rem]">
                          {job.tag}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-sm text-muted">
                      {job.company}
                      {job.location ? ` · ${job.location}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasDetails ? (
                      <span className="hidden font-mono text-[0.65rem] text-muted/60 md:inline md:group-hover:hidden md:group-focus-within:hidden">
                        details ↓
                      </span>
                    ) : null}
                    <span className="font-mono text-xs text-muted">{job.period}</span>
                  </div>
                </div>

                {hasDetails ? (
                  <div className="grid grid-rows-[1fr] opacity-100 transition-all duration-500 ease-out md:grid-rows-[0fr] md:opacity-0 md:group-hover:grid-rows-[1fr] md:group-hover:opacity-100 md:group-focus-within:grid-rows-[1fr] md:group-focus-within:opacity-100">
                    <div className="overflow-hidden">
                      <div className="flex flex-col gap-3 pt-4">
                        {job.summary ? (
                          <p className="text-sm text-muted">{job.summary}</p>
                        ) : null}
                        {job.highlights ? (
                          <ul className="flex flex-col gap-1.5 text-sm text-muted">
                            {job.highlights.map((item) => (
                              <li key={item} className="flex gap-2.5">
                                <span aria-hidden className="mt-1 text-accent">
                                  &#9656;
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {job.tech ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {job.tech.map((tech) => (
                              <span
                                key={tech}
                                className="rounded-md border border-border px-2 py-0.5 font-mono text-[0.7rem] text-muted"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function SkillsSection() {
  return (
    <section id="skills" className="flex scroll-mt-24 flex-col gap-10">
      <SectionHeading index="02" title="Skills" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {site.skillGroups.map((group, index) => (
          <Reveal key={group.label} delayMs={index * 50}>
            <div className="group flex h-full flex-col gap-3 rounded-lg border border-border bg-[var(--color-surface)] p-5 transition-colors duration-300 hover:border-accent/40">
              <h3 className="font-mono text-xs uppercase tracking-widest text-accent">
                {group.label}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors group-hover:text-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted">languages:</span>
          {site.languages.map((language) => (
            <Badge key={language} variant="outline">
              {language}
            </Badge>
          ))}
        </div>
      </Reveal>

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
                    <span className="font-mono text-xs text-muted">
                      {edu.period}
                      {edu.note ? ` · ${edu.note}` : ""}
                    </span>
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

function ProjectsSection() {
  return (
    <section id="projects" className="flex scroll-mt-24 flex-col gap-10">
      <SectionHeading index="03" title="Projects" />
      <div className="grid gap-4 sm:grid-cols-2">
        {site.projects.map((project, index) => (
          <Reveal key={project.name} delayMs={index * 70}>
            <ProjectCard project={project} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ProjectCard({ project }: { project: (typeof site.projects)[number] }) {
  const external = project.href?.startsWith("http");
  const content = (
    <div className="flex h-full flex-col gap-3 rounded-lg border border-border bg-[var(--color-surface)] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">{project.name}</h3>
        {project.href ? (
          <span
            aria-hidden
            className="font-mono text-muted transition-transform group-hover/card:translate-x-0.5 group-hover/card:text-accent"
          >
            ↗
          </span>
        ) : null}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-muted">{project.description}</p>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {project.tech.map((tech) => (
          <span
            key={tech}
            className="rounded-md border border-border px-2 py-0.5 font-mono text-[0.7rem] text-muted"
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );

  if (!project.href) {
    return content;
  }

  return (
    <a
      href={project.href}
      className="group/card block h-full"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {content}
    </a>
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
            <span className="font-mono text-xs text-accent">04 / contact</span>
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
