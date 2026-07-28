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
  "linkedin",
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

// Per-aggregator toggle for whether the daily cron includes it. Manual Sync
// buttons ignore this — it only gates the automatic cron run.
export const aggregatorSettings = pgTable("aggregator_settings", {
  id: text("id").primaryKey(),
  autoSyncEnabled: boolean("auto_sync_enabled").default(true).notNull(),
});

export const linkedinSavedSearches = pgTable("linkedin_saved_searches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  keywords: varchar("keywords", { length: 256 }).notNull().default(""),
  location: varchar("location", { length: 256 }).notNull().default(""),
  // Cached typeaheadHits result for `location` — resolved lazily and reused
  // until the location text changes.
  geoId: varchar("geo_id", { length: 32 }),
  postedWithin: varchar("posted_within", { length: 16 }),
  experience: varchar("experience", { length: 16 }),
  jobType: jsonb("job_type").$type<string[]>().notNull().default([]),
  workplace: jsonb("workplace").$type<string[]>().notNull().default([]),
  easyApplyOnly: boolean("easy_apply_only").default(false).notNull(),
  fewApplicants: boolean("few_applicants").default(false).notNull(),
  sort: varchar("sort", { length: 8 }).notNull().default("DD"),
  radiusMiles: varchar("radius_miles", { length: 8 }),
  active: boolean("active").default(true).notNull(),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trackedBoards = pgTable("tracked_boards", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: jobSourceEnum("source").notNull(),
  boardToken: varchar("board_token", { length: 128 }).notNull(),
  companyName: varchar("company_name", { length: 128 }).notNull(),
  active: boolean("active").default(true).notNull(),
  // Independent from `active`: a board can stay tracked (manual Sync still
  // works) while being excluded from the daily cron run.
  autoSyncEnabled: boolean("auto_sync_enabled").default(true).notNull(),
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
  linkedinSavedSearches: many(linkedinSavedSearches),
}));

export const linkedinSavedSearchesRelations = relations(linkedinSavedSearches, ({ one }) => ({
  user: one(users, { fields: [linkedinSavedSearches.userId], references: [users.id] }),
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
