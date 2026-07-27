import { Button } from "@repo/ui";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Job Application Helper</h1>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
      <p className="text-sm text-muted">
        Signed in as {session?.user?.name ?? "unknown"}. Job intake, matching, and
        cover-letter drafting land in later phases.
      </p>
      <div className="flex gap-4">
        <Link href="/profile" className="text-sm text-accent underline">
          Manage profile →
        </Link>
        <Link href="/jobs" className="text-sm text-accent underline">
          Jobs →
        </Link>
        <Link href="/applications" className="text-sm text-accent underline">
          Applications →
        </Link>
        <Link href="/preferences" className="text-sm text-accent underline">
          Search preferences →
        </Link>
      </div>
    </main>
  );
}
