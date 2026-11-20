export type Presence = "in" | "out";

export interface Person {
  id: string;
  username: string;
  displayName: string;
  presence: Presence;
  presenceUpdatedAt: string | null;
  hasKey: boolean;
}

export interface ChatSummary {
  id: string;
  kind: "direct" | "group";
  name: string | null;
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
}
