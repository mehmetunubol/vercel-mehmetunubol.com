import { initials } from "@/lib/format";
import type { Presence } from "@/lib/types";

export function Avatar({
  name,
  presence,
  size = 44,
}: {
  name: string;
  presence?: Presence;
  size?: number;
}) {
  return (
    <span className="relative inline-flex">
      <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
        {initials(name)}
      </span>
      {presence ? (
        <span
          className={`dot ${presence === "in" ? "dot-in" : "dot-out"} absolute -right-0.5 -bottom-0.5 ring-2 ring-[var(--bg)]`}
          style={{ width: size * 0.26, height: size * 0.26 }}
        />
      ) : null}
    </span>
  );
}
