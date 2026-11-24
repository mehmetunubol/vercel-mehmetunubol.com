import { dateLocale, type Locale } from "@/lib/i18n";
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

const pad = (n: number) => String(n).padStart(2, "0");

export function timeLabel(iso: string | null, now = new Date(), locale: Locale = "en") {
  if (!iso) return "";
  const date = new Date(iso);
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? `${pad(date.getHours())}:${pad(date.getMinutes())}`
    : date.toLocaleDateString(dateLocale(locale), { day: "numeric", month: "short" });
}

export function sinceLabel(iso: string | null, now = Date.now(), locale: Locale = "en") {
  const tr = locale === "tr";
  if (!iso) return tr ? "henüz ayarlanmadı" : "not set yet";
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return tr ? "az önce" : "just now";
  if (minutes < 60) return tr ? `${minutes} dk` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tr ? `${hours} sa` : `${hours} h`;
  return new Date(iso).toLocaleDateString(dateLocale(locale), { day: "numeric", month: "short" });
}

export function ttlLabel(hours: number, locale: Locale = "en") {
  if (locale === "tr") return hours % 24 === 0 ? `${hours / 24} gün` : `${hours} saat`;
  if (hours % 24 === 0) return hours === 24 ? "24 hours" : `${hours / 24} days`;
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/**
 * "Online", or the exact time someone was last active:
 * "Last seen 14:05", "Last seen yesterday 14:05", "Last seen Wed 14:05",
 * "Last seen 21 Nov 14:05". Null when it isn't shared.
 */
export function onlineLabel(
  online: boolean | null,
  lastSeenAt: string | null,
  now = new Date(),
  locale: Locale = "en",
) {
  const tr = locale === "tr";
  if (online === null) return null;
  if (online) return tr ? "Çevrimiçi" : "Online";
  if (!lastSeenAt) return tr ? "Henüz görülmedi" : "Not seen yet";
  const seen = new Date(lastSeenAt);
  const time = `${pad(seen.getHours())}:${pad(seen.getMinutes())}`;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(seen)) / 86_400_000);
  const prefix = tr ? "Son görülme" : "Last seen";
  if (days <= 0) return `${prefix} ${time}`;
  if (days === 1) return tr ? `${prefix} dün ${time}` : `${prefix} yesterday ${time}`;
  const tag = dateLocale(locale);
  if (days < 7) return `${prefix} ${seen.toLocaleDateString(tag, { weekday: "short" })} ${time}`;
  return `${prefix} ${seen.toLocaleDateString(tag, { day: "numeric", month: "short" })} ${time}`;
}
