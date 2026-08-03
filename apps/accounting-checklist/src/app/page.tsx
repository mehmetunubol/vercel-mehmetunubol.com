import { Button } from "@repo/ui";
import { auth, signOut } from "@/lib/auth";
import { ChecklistApp } from "@/components/checklist-app";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
              A
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight">Accounting Checklist</h1>
              <p className="truncate text-xs text-muted">{session?.user?.email}</p>
            </div>
          </div>
          <form action={logout} className="shrink-0">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <ChecklistApp />
      </main>
    </div>
  );
}
