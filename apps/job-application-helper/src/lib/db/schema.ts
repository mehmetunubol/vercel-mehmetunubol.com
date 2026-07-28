import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const applicationStatusEnum = pgEnum("application_status", [
  "discovered",
  "matched",
  "drafted",
  "ready",
  "applied",
  "interviewing",
  "rejected",
  "offer",
]);

export const profileSourceEnum = pgEnum("profile_source", ["fetched_web", "uploaded_cv"]);

export const jobSourceEnum = pgEnum("job_source", [
  "greenhouse",
  "lever",
  "remoteok",
  "arbeitnow",
  "manual",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  source: profileSourceEnum("source").notNull(),
  label: varchar("label", { length: 128 }),
  data: jsonb("data").notNull(),
  rawFileName: text("raw_file_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const searchPreferences = pgTable("search_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  excludeKeywords: jsonb("exclude_keywords").$type<string[]>().notNull().default([]),
  locations: jsonb("locations").$type<string[]>().notNull().default([]),
  remoteOnly: boolean("remote_only").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tracks last-synced time for targets that aren't a tracked board (currently
// just the two aggregators) — trackedBoards already has its own lastFetchedAt.
export const syncStatus = pgTable("sync_status", {
  id: text("id").primaryKey(),
  lastSyncedAt: timestamp("last_synced_at").notNull(),
});

export const trackedBoards = pgTable("tracked_boards", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: jobSourceEnum("source").notNull(),
  boardToken: varchar("board_token", { length: 128 }).notNull(),
  companyName: varchar("company_name", { length: 128 }).notNull(),
  active: boolean("active").default(true).notNull(),
  lastFetchedAt: timestamp("last_fetched_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: jobSourceEnum("source").notNull(),
    externalId: varchar("external_id", { length: 256 }).notNull(),
    url: text("url").notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    company: varchar("company", { length: 256 }).notNull(),
    location: varchar("location", { length: 256 }),
    rawDescription: text("raw_description").notNull(),
    postedAt: timestamp("posted_at"),
    discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
    trackedBoardId: uuid("tracked_board_id").references(() => trackedBoards.id),
  },
  (table) => [uniqueIndex("jobs_source_external_id_idx").on(table.source, table.externalId)],
);

export const matches = pgTable("matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  score: real("score").notNull(),
  rationale: jsonb("rationale").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id),
  matchId: uuid("match_id").references(() => matches.id),
  status: applicationStatusEnum("status").default("discovered").notNull(),
  coverLetter: text("cover_letter"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profiles: many(profiles),
  applications: many(applications),
  searchPreferences: one(searchPreferences),
}));

export const searchPreferencesRelations = relations(searchPreferences, ({ one }) => ({
  user: one(users, { fields: [searchPreferences.userId], references: [users.id] }),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  matches: many(matches),
  applications: many(applications),
}));

export const trackedBoardsRelations = relations(trackedBoards, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  trackedBoard: one(trackedBoards, {
    fields: [jobs.trackedBoardId],
    references: [trackedBoards.id],
  }),
  matches: many(matches),
  applications: many(applications),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  job: one(jobs, { fields: [matches.jobId], references: [jobs.id] }),
  profile: one(profiles, { fields: [matches.profileId], references: [profiles.id] }),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  job: one(jobs, { fields: [applications.jobId], references: [jobs.id] }),
  profile: one(profiles, { fields: [applications.profileId], references: [profiles.id] }),
  match: one(matches, { fields: [applications.matchId], references: [matches.id] }),
}));
