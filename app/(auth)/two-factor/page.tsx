import type { Metadata } from "next"
import { getExtracted } from "next-intl/server"

import { TwoFactorForm } from "@/components/auth/two-factor-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getExtracted()

  return { title: t("Two-Factor Authentication") }
}

export default function page() {
  return <TwoFactorForm />
}
