export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

const pad = (n: number) => String(n).padStart(2, "0");

export function timeLabel(iso: string | null, now = new Date()) {
  if (!iso) return "";
  const date = new Date(iso);
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? `${pad(date.getHours())}:${pad(date.getMinutes())}`
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function sinceLabel(iso: string | null, now = Date.now()) {
  if (!iso) return "not set yet";
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

export function ttlLabel(hours: number) {
  if (hours % 24 === 0) return hours === 24 ? "24 hours" : `${hours / 24} days`;
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/**
 * "Online", or the exact time someone was last active:
 * "Last seen 14:05", "Last seen yesterday 14:05", "Last seen Wed 14:05",
 * "Last seen 21 Nov 14:05". Null when it isn't shared.
 */
export function onlineLabel(online: boolean | null, lastSeenAt: string | null, now = new Date()) {
  if (online === null) return null;
  if (online) return "Online";
  if (!lastSeenAt) return "Not seen yet";
  const seen = new Date(lastSeenAt);
  const time = `${pad(seen.getHours())}:${pad(seen.getMinutes())}`;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(seen)) / 86_400_000);
  if (days <= 0) return `Last seen ${time}`;
  if (days === 1) return `Last seen yesterday ${time}`;
  if (days < 7)
    return `Last seen ${seen.toLocaleDateString("en-GB", { weekday: "short" })} ${time}`;
  return `Last seen ${seen.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${time}`;
}
