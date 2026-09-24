import { Suspense } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"
import { getExtracted } from "next-intl/server"

import { TwoFactorForm } from "@/components/auth/two-factor-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getExtracted()

  return { title: t("Two-Factor Authentication") }
}

async function DynamicMarker() {
  await connection()
  return null
}

export default function page() {
  return (
    <>
      <TwoFactorForm />
      <Suspense>
        <DynamicMarker />
      </Suspense>
    </>
  )
}
