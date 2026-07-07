import { Reveal } from "@repo/ui";

export interface SectionHeadingProps {
  index: string;
  title: string;
}

export function SectionHeading({ index, title }: SectionHeadingProps) {
  return (
    <Reveal className="flex flex-col gap-3">
      <span className="font-mono text-xs tracking-wide text-accent">
        {index}
        <span className="text-muted"> / {title.toLowerCase()}</span>
      </span>
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
    </Reveal>
  );
}
