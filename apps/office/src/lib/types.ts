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
  };
  people: Person[];
  chats: ChatSummary[];
  ttlHours: number;
  pendingInvites: number;
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
