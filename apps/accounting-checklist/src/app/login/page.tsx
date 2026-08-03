import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@repo/ui";
import { signIn } from "@/lib/auth";

async function login() {
  "use server";
  await signIn("google", { redirectTo: "/dashboard" });
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
            A
          </div>
          <CardTitle>Accounting Checklist</CardTitle>
          <CardDescription>Sign in with the allowed Google account.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              That account isn&apos;t allowed to access this app.
            </p>
          ) : null}
          <form action={login}>
            <Button type="submit" className="w-full">
              Sign in with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
