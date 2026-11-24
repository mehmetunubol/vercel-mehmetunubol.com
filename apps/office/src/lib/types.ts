export type Presence = "in" | "out";
export type PlanPrecision = "exact" | "morning" | "afternoon" | "evening";

export interface Person {
  id: string;
  username: string;
  displayName: string;
  presence: Presence;
  presenceUpdatedAt: string | null;
  plannedPresence: Presence | null;
  plannedAt: string | null;
  plannedPrecision: PlanPrecision | null;
  hasKey: boolean;
  // null when online status isn't shared (either side hides it).
  online: boolean | null;
  lastSeenAt: string | null;
}

export interface ChatSummary {
  id: string;
  kind: "direct" | "group";
  name: string | null;
  announcement: boolean;
  lastMessageAt: string | null;
  unread: number;
  memberIds: string[];
}

export interface AppState {
  me: {
    id: string;
    username: string;
    displayName: string;
    isAdmin: boolean;
    publicKey: string | null;
    hideOnline: boolean;
  };
  people: Person[];
  chats: ChatSummary[];
  ttlHours: number;
  pendingInvites: number;
  photosAllowed: boolean;
  admin: { securityAlerts: number; loginsDisabled: boolean } | null;
}

export type Rsvp = "pending" | "going" | "maybe" | "declined";

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  durationMinutes: number;
  createdBy: string;
  invites: { userId: string; response: Rsvp }[];
}
