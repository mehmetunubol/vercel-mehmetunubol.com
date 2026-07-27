import Link from "next/link";
import type { ReactNode } from "react";
import { Footer, Header, Shell, ThemeToggle } from "@repo/ui";
import { auth, isAdmin, signOut } from "@/lib/auth";
import { NavLinks } from "@/components/nav-links";
import { SubmitButton } from "@/components/submit-button";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export async function AppShell({ children }: { children: ReactNode }) {
  const session = await auth();
  const admin = session?.user ? await isAdmin() : false;

  return (
    <Shell
      header={
        <Header
          brand={
            <Link href="/" className="group flex items-center gap-2 font-mono text-sm">
              <span className="grid h-6 w-6 place-items-center rounded bg-accent text-xs font-bold text-accent-foreground">
                J
              </span>
              <span className="font-semibold tracking-tight">job helper</span>
            </Link>
          }
          nav={<NavLinks isAdmin={admin} />}
          actions={
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {session?.user ? (
                <form action={logout}>
                  <SubmitButton variant="outline" size="sm" pendingText="Signing out…">
                    Sign out
                  </SubmitButton>
                </form>
              ) : null}
            </div>
          }
        />
      }
      footer={
        <Footer>
          <span>Personal job-search assistant — {session?.user?.name ?? "signed out"}</span>
        </Footer>
      }
    >
      {children}
    </Shell>
  );
}
