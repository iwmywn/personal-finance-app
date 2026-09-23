import { Suspense } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"
import { getExtracted } from "next-intl/server"

import { TwoFactorVerificationForm } from "@/components/auth/two-factor-form"

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
      <TwoFactorVerificationForm />
      <Suspense>
        <DynamicMarker />
      </Suspense>
    </>
  )
}
