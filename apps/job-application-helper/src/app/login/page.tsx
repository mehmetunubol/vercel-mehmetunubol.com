import { Button } from "@repo/ui";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";

  const username = formData.get("username");
  const password = formData.get("password");

  try {
    await signIn("credentials", { username, password, redirectTo: "/" });
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
    <main className="flex min-h-full items-center justify-center p-6">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-lg border border-border p-6">
        <h1 className="text-lg font-semibold">Job Application Helper</h1>
        {error ? <p className="text-sm text-red-500">Invalid username or password.</p> : null}
        <div className="space-y-1">
          <label htmlFor="username" className="text-sm text-muted">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
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
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </main>
  );
}
