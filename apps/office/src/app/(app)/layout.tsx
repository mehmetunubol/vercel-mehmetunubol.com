import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AppProvider } from "@/components/app-provider";
import { TabBar } from "@/components/tab-bar";

export const dynamic = "force-dynamic";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  return (
    <AppProvider userId={me.id}>
      {children}
      <TabBar isAdmin={me.isAdmin} />
    </AppProvider>
  );
}
