import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/service-worker";
import { I18nProvider } from "@/components/i18n-provider";
import { appName } from "@/lib/app-name";
import { requestLocale } from "@/lib/i18n-server";
import "./globals.css";

// Name and description follow the browser's language (Turkish or English).
export async function generateMetadata(): Promise<Metadata> {
  const { name, short, description } = appName(await requestLocale());
  return {
    title: name,
    description,
    robots: { index: false, follow: false },
    applicationName: name,
    appleWebApp: { capable: true, title: short, statusBarStyle: "black-translucent" },
    icons: {
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8e2d6" },
    { media: "(prefers-color-scheme: dark)", color: "#121315" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Before sign-in the phone's language decides; signed-in pages may override it.
  const locale = await requestLocale();
  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
