"use client"

import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckIcon, InfoIcon, TriangleAlertIcon, XIcon, Loader2Icon } from "lucide-react"

// A small filled badge carries the meaning; the capsule itself stays frosted glass (globals.css, .toast-glass).
const badge = "grid size-6 place-items-center rounded-md text-white"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const t = useTranslations("common") // screen-reader labels in the user's language (sonner's are English)

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <span className={`${badge} bg-green-600`}><CheckIcon className="size-3.5" strokeWidth={3} /></span>
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <span className={`${badge} bg-red-500`}><XIcon className="size-3.5" strokeWidth={3} /></span>
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--width": "420px", // the widest a toast gets on desktop; each one is only as wide as its text
        } as React.CSSProperties
      }
      closeButton
      containerAriaLabel={t("notifications")}
      // Below the iPhone notch / status bar (theme tweak, 2026-11-08).
      offset={{ top: "max(16px, env(safe-area-inset-top))" }}
      mobileOffset={{ top: "max(12px, env(safe-area-inset-top))" }}
      toastOptions={{
        closeButtonAriaLabel: t("close"),
        classNames: {
          toast: "cn-toast toast-glass", // compact frosted capsule (user, 2026-11-08), styled in globals.css
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
