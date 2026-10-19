import type { Metadata } from "next"
import { getExtracted } from "next-intl/server"

import SettingsPage from "@/components/settings/settings-page"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getExtracted()

  return {
    title: t("Settings"),
  }
}

export default function page() {
  return <SettingsPage />
}
