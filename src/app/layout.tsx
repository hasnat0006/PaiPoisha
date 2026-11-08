import type { Metadata, Viewport } from "next";
// One font for Bangla + Latin, bundled from npm so it works offline and in the app stores.
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";
import { ThemeProvider } from "next-themes";
import { AppShell } from "@/components/shell/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/i18n/provider";
import "./globals.css";


export const metadata: Metadata = {
  title: "PaiPoisha — পাই-পয়সার হিসাব",
  description: "A free money tracker for Bangladesh: cash, bKash, Nagad and bank in one place.",
  appleWebApp: { capable: true, title: "PaiPoisha", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" className="h-full antialiased font-sans" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* Theme: Light / Dark / Match phone, picked on the More tab; next-themes stores it and avoids a flash on load. */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <I18nProvider>
            <AppShell>{children}</AppShell>
            <Toaster position="top-center" />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
