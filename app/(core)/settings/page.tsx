import { Suspense } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"
import { getExtracted } from "next-intl/server"

import SettingsPage from "@/components/settings/settings-page"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getExtracted()

  return {
    title: t("Settings"),
  }
}

async function DynamicMarker() {
  await connection()
  return null
}

export default function page() {
  return (
    <>
      <SettingsPage />
      <Suspense>
        <DynamicMarker />
      </Suspense>
    </>
  )
}
