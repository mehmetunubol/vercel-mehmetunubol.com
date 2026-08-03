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
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Accounting Checklist</h1>
          <p className="text-sm text-muted">{session?.user?.email}</p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <ChecklistApp />
    </main>
  );
}
