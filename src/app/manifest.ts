import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PaiPoisha — পাই-পয়সার হিসাব",
    short_name: "PaiPoisha",
    description: "A free money tracker for Bangladesh",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0B7A57",
    lang: "bn",
    // Official logo (H3 Budget card), drawn by scripts/make-icons.mjs.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the installed app icon (Android) → drag one onto the home screen for one-tap add (spec §9).
    shortcuts: [
      { name: "খরচ যোগ · Add expense", short_name: "খরচ", url: "/add/?type=expense", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "আয় যোগ · Add income", short_name: "আয়", url: "/add/?type=income", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "ট্রান্সফার · Transfer", short_name: "ট্রান্সফার", url: "/add/?type=transfer", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
