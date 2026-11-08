import type { NextConfig } from "next";

/**
 * The app is a static, client-side SPA (see CLAUDE.md, rule 1).
 * `output: "export"` writes plain HTML/CSS/JS to /out so the same build can be
 * hosted anywhere for free and later bundled into Android/iOS with Capacitor.
 *
 * Do NOT enable cacheComponents / partialPrefetching: they need a Node server.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // /add -> /add/index.html (works on static hosts and in Capacitor)
  images: { unoptimized: true }, // next/image optimisation needs a server
  allowedDevOrigins: ["192.168.0.*"], // dev only: test on phones over the home LAN
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
