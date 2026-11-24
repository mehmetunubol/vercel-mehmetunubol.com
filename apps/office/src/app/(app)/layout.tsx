import { getCurrentUser } from "@/lib/session";
import { AppProvider } from "@/components/app-provider";
import { TabBar } from "@/components/tab-bar";
import { Gate } from "@/components/gate";
import { SessionGuard } from "@/components/session-guard";
import { AutoLock } from "@/components/auto-lock";
import { I18nProvider } from "@/components/i18n-provider";
import { requestLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  // Signed out, closed since signing in, or reset by the admin: show the decoy.
  if (!me) return <Gate />;
  // The person's own language choice, if any, wins over the phone's.
  const locale = await requestLocale(me.locale);
  return (
    <I18nProvider locale={locale}>
      <SessionGuard>
        <AppProvider userId={me.id}>
          {children}
          <TabBar isAdmin={me.isAdmin} />
          <AutoLock />
        </AppProvider>
      </SessionGuard>
    </I18nProvider>
  );
}
