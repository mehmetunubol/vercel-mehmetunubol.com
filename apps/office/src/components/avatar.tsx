import { cn } from "@repo/ui";
import { initials } from "@/lib/format";
import type { Presence } from "@/lib/types";

/**
 * Initials avatar. The small dot is the office status (In / Out); the glowing
 * ring means the person has the app open right now.
 */
export function Avatar({
  name,
  presence,
  online,
  size = 44,
}: {
  name: string;
  presence?: Presence;
  online?: boolean;
  size?: number;
}) {
  return (
    <span className="relative inline-flex" data-online={online ? "true" : undefined}>
      <span
        className={cn("avatar", online && "avatar-online")}
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {initials(name)}
      </span>
      {presence ? (
        <span
          className={`dot ${presence === "in" ? "dot-in" : "dot-out"} absolute -right-0.5 -bottom-0.5 ring-2 ring-[var(--bg)]`}
          style={{ width: size * 0.26, height: size * 0.26 }}
        />
      ) : null}
      {online ? <span className="sr-only">online</span> : null}
    </span>
  );
}
