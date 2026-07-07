import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider, themeInitScript } from "@repo/ui";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mehmet Ünübol — Back-end Developer",
    template: "%s — Mehmet Ünübol",
  },
  description:
    "Mehmet Ünübol is a back-end developer based in İzmir, Türkiye, specializing in Node.js, TypeScript, and full-stack development.",
  metadataBase: new URL("https://mehmetunubol.com"),
  openGraph: {
    title: "Mehmet Ünübol — Back-end Developer",
    description:
      "Back-end developer based in İzmir, Türkiye, specializing in Node.js, TypeScript, and full-stack development.",
    url: "https://mehmetunubol.com",
    siteName: "mehmetunubol.com",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript("theme", "dark") }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
      </body>
    </html>
  );
}
