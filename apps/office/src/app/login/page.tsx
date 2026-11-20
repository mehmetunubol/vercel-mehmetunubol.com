import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";
import { Mark } from "@/components/mark";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center px-5">
      <div className="rise w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Mark size={56} />
          <div>
            <h1 className="text-2xl font-semibold">Office</h1>
            <p className="mt-1 text-[15px] text-[var(--ink-2)]">
              Who&rsquo;s in, and a quiet place to talk.
            </p>
          </div>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-[var(--ink-3)]">
          Accounts are created by the administrator.
        </p>
      </div>
    </main>
  );
}
