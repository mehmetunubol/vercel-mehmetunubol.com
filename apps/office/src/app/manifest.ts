import type { MetadataRoute } from "next";
import { appName } from "@/lib/app-name";
import { requestLocale } from "@/lib/i18n-server";

// Installed name follows the phone's language at install time.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { name, short, description } = appName(await requestLocale());
  return {
    id: "/",
    name,
    short_name: short,
    description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#121315",
    theme_color: "#121315",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
