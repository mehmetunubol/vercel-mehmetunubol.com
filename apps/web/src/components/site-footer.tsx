import { Footer } from "@repo/ui";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <Footer className="print:hidden">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs text-muted">
            <span className="text-accent">$</span> built with next.js · turborepo · tailwind
          </p>
          <p>
            &copy; {new Date().getFullYear()} {site.name}
          </p>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs">
          {site.socials.map((social) => (
            <a
              key={social.href}
              href={social.href}
              className="rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
              {...(social.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {social.label.toLowerCase()}
            </a>
          ))}
        </div>
      </div>
    </Footer>
  );
}
