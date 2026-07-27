import { Badge, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { desc, eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_USERNAME, isAdmin, requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AppShell } from "@/components/app-shell";
import { ActionForm, type ActionResult } from "@/components/action-form";

const inputClass =
  "w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm transition-colors focus:border-accent focus:outline-none";

async function createUser(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  "use server";
  if (!(await isAdmin())) return { ok: false, message: "Not authorized." };

  const username = formData.get("username");
  const password = formData.get("password");
  const displayName = formData.get("displayName");
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return { ok: false, message: "Username and password are required." };
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing) return { ok: false, message: `Username "${username}" already exists.` };

  const passwordHash = await hash(password, 12);
  await db.insert(users).values({
    username,
    passwordHash,
    displayName: typeof displayName === "string" && displayName ? displayName : null,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

async function resetPassword(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  "use server";
  if (!(await isAdmin())) return { ok: false, message: "Not authorized." };

  const userId = formData.get("userId");
  const password = formData.get("password");
  if (typeof userId !== "string" || typeof password !== "string" || !password) {
    return { ok: false, message: "Missing user or password." };
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  const passwordHash = await hash(password, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  revalidatePath("/admin/users");
  return { ok: true };
}

async function deleteUser(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  "use server";
  if (!(await isAdmin())) return { ok: false, message: "Not authorized." };

  const userId = formData.get("userId");
  if (typeof userId !== "string") return { ok: false, message: "Missing user." };

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) return { ok: false, message: "User not found." };
  if (target.username === ADMIN_USERNAME) {
    return { ok: false, message: `Can't delete the admin account (${ADMIN_USERNAME}).` };
  }

  const currentUserId = await requireUserId();
  if (userId === currentUserId) return { ok: false, message: "Can't delete your own account." };

  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true };
}

export default async function AdminUsersPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/dashboard");

  const userList = await db.select().from(users).orderBy(desc(users.createdAt));

  return (
    <AppShell>
      <div className="max-w-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Manage users</h1>
          <p className="text-sm text-muted">
            Only <span className="font-mono text-accent">{ADMIN_USERNAME}</span> can create, reset, or remove
            accounts.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a user</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={createUser} submitLabel="Create user" pendingText="Creating…" size="sm" className="space-y-2">
              <input name="username" placeholder="Username" required className={inputClass} />
              <input name="password" type="password" placeholder="Password (min 8 chars)" required minLength={8} className={inputClass} />
              <input name="displayName" placeholder="Display name (optional)" className={inputClass} />
            </ActionForm>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted">Users — {userList.length}</h2>
          <ul className="space-y-2">
            {userList.map((user) => (
              <li key={user.id} className="space-y-2 rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">
                    {user.username}
                    {user.displayName ? <span className="font-normal text-muted"> — {user.displayName}</span> : null}
                  </span>
                  {user.username === ADMIN_USERNAME ? <Badge variant="accent">admin</Badge> : null}
                </div>

                <div className="flex flex-wrap items-start gap-3">
                  <ActionForm
                    action={resetPassword}
                    hiddenFields={{ userId: user.id }}
                    submitLabel="Reset password"
                    pendingText="Resetting…"
                    size="sm"
                    variant="outline"
                    className="flex items-start gap-2"
                  >
                    <input
                      name="password"
                      type="password"
                      placeholder="New password"
                      required
                      minLength={8}
                      className={`${inputClass} w-40`}
                    />
                  </ActionForm>

                  {user.username !== ADMIN_USERNAME ? (
                    <ActionForm
                      action={deleteUser}
                      hiddenFields={{ userId: user.id }}
                      submitLabel="Delete"
                      pendingText="Deleting…"
                      size="sm"
                      variant="ghost"
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
