import { getCurrentUser } from "@/lib/session";
import { AppProvider } from "@/components/app-provider";
import { TabBar } from "@/components/tab-bar";
import { Gate } from "@/components/gate";
import { SessionGuard } from "@/components/session-guard";

export const dynamic = "force-dynamic";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  // Signed out, closed since signing in, or reset by the admin: show the decoy.
  if (!me) return <Gate />;
  return (
    <SessionGuard>
      <AppProvider userId={me.id}>
        {children}
        <TabBar isAdmin={me.isAdmin} />
      </AppProvider>
    </SessionGuard>
  );
}
