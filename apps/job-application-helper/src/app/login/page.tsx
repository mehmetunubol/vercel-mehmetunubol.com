import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";

async function login(formData: FormData) {
  "use server";

  const username = formData.get("username");
  const password = formData.get("password");

  try {
    await signIn("credentials", { username, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 grid h-8 w-8 place-items-center rounded bg-accent text-sm font-bold text-accent-foreground">
            J
          </div>
          <CardTitle>Job Application Helper</CardTitle>
          <CardDescription>Sign in to your personal job-search workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            {error ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                Invalid username or password.
              </p>
            ) : null}
            <div className="space-y-1">
              <label htmlFor="username" className="text-sm text-muted">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoFocus
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm text-muted">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none"
              />
            </div>
            <SubmitButton className="w-full" pendingText="Signing in…">
              Sign in
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
