"use client";

// Privacy policy and terms (spec §11), Bangla + English. Public: opens even before sign-in (welcome gate skips it).
// Terms are on the same page at /privacy/#terms.
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/common/PageHeader";

const CONTACT_URL = "https://github.com/hasnat0006/PaiPoisha/issues";

const PRIVACY = ["store", "where", "never", "others", "delete", "contact"] as const;
const TERMS = ["free", "notBank", "yours", "changes"] as const;

export default function PrivacyPage() {
  const t = useTranslations("privacy");
  const link = (chunks: React.ReactNode) => (
    <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
      {chunks}
    </a>
  );
  const section = (id: (typeof PRIVACY)[number] | (typeof TERMS)[number]) => (
    <section key={id} className="flex flex-col gap-1">
      <h3 className="font-semibold">{t(`${id}Title`)}</h3>
      <p className="text-muted-foreground">{t.rich(`${id}Body`, { link })}</p>
    </section>
  );
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <PageHeader title={t("title")} />
      <p className="text-sm text-muted-foreground">{t("updated")}</p>
      <p>{t("intro")}</p>
      {PRIVACY.map(section)}
      <h2 id="terms" className="scroll-mt-4 pt-4 text-lg font-semibold">{t("termsTitle")}</h2>
      {TERMS.map(section)}
    </main>
  );
}
