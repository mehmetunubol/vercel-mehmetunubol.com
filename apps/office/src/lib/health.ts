import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** Neon's free plan includes 0.5 GB of storage per project. */
export const FREE_PLAN_STORAGE_BYTES = 512 * 1024 * 1024;

type Row = Record<string, unknown>;

async function rows(query: ReturnType<typeof sql>): Promise<Row[]> {
  const result = (await db.execute(query)) as unknown as { rows: Row[] };
  return result.rows;
}

const num = (value: unknown) => Number(value ?? 0);

export interface Health {
  databaseBytes: number;
  largestTables: { name: string; bytes: number }[];
  photoCount: number;
  photoBytes: number;
  messages: number;
  upcomingEvents: number;
  people: number;
  activeToday: number;
  onlineNow: number;
  pushDevices: number;
}

/** Usage numbers for the admin's Health section. Counts only; no content. */
export async function getHealth(): Promise<Health> {
  const [size, tables, photos, counts] = await Promise.all([
    rows(sql`select pg_database_size(current_database())::bigint as bytes`),
    rows(sql`
      select c.relname as name, pg_total_relation_size(c.oid)::bigint as bytes
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by bytes desc limit 4`),
    rows(sql`
      select count(*)::int as count, coalesce(sum(size), 0)::bigint as bytes
      from attachments where ciphertext is not null`),
    rows(sql`
      select
        (select count(*) from messages where expires_at > now())::int as messages,
        (select count(*) from events
           where starts_at + make_interval(mins => duration_minutes) > now())::int as upcoming_events,
        (select count(*) from users)::int as people,
        (select count(*) from users where last_seen_at > now() - interval '24 hours')::int as active_today,
        (select count(*) from users where online_until > now())::int as online_now,
        (select count(*) from push_subscriptions)::int as push_devices`),
  ]);
  const c = counts[0] ?? {};
  return {
    databaseBytes: num(size[0]?.bytes),
    largestTables: tables.map((t) => ({ name: String(t.name), bytes: num(t.bytes) })),
    photoCount: num(photos[0]?.count),
    photoBytes: num(photos[0]?.bytes),
    messages: num(c.messages),
    upcomingEvents: num(c.upcoming_events),
    people: num(c.people),
    activeToday: num(c.active_today),
    onlineNow: num(c.online_now),
    pushDevices: num(c.push_devices),
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
