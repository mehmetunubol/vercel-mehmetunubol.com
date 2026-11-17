import { emptyMonthState, type ChecklistKey, type ChecklistState, type MonthState } from "@/lib/checklist";

// The client's latest copy of each checklist's state.json.
//
// Every edit is applied to the *latest* copy, never to a snapshot captured
// when an async action (an upload, a summary) started — so overlapping
// actions compose instead of overwriting each other. And a copy fetched
// from the server is ignored if local edits landed after that fetch began,
// so a slow GET can't roll back changes that are newer than it.
export class ChecklistStateStore {
  private states: Partial<Record<ChecklistKey, ChecklistState>> = {};
  private versions: Partial<Record<ChecklistKey, number>> = {};

  get(key: ChecklistKey): ChecklistState | undefined {
    return this.states[key];
  }

  // Bumped on every local edit; take it before fetching, hand it to receive().
  version(key: ChecklistKey): number {
    return this.versions[key] ?? 0;
  }

  // Returns the state the UI should show for `key` after a fetch.
  receive(key: ChecklistKey, fetched: ChecklistState, versionAtFetchStart: number): ChecklistState {
    const local = this.states[key];
    if (local && this.version(key) !== versionAtFetchStart) return local;
    this.states[key] = fetched;
    return fetched;
  }

  // Applies `mutate` to the latest copy of one month. Returns the new full
  // state to persist, or null if that checklist was never loaded.
  update(
    key: ChecklistKey,
    month: string,
    mutate: (prev: MonthState) => MonthState,
  ): ChecklistState | null {
    const current = this.states[key];
    if (!current) return null;
    const next: ChecklistState = {
      months: { ...current.months, [month]: mutate(current.months[month] ?? emptyMonthState()) },
    };
    this.states[key] = next;
    this.versions[key] = this.version(key) + 1;
    return next;
  }
}
