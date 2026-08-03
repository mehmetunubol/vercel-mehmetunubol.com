import type { Metadata, Viewport } from "next";
import { ThemeProvider, themeInitScript } from "@repo/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accounting Checklist",
  description: "Personal monthly bookkeeping checklist.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript("theme", "dark") }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
      </body>
    </html>
  );
}
