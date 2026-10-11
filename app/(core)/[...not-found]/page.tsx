import { Suspense } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"
import { getExtracted } from "next-intl/server"

import { NotFoundPage } from "@/components/layout/not-found-page"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getExtracted()

  return {
    title: t("Not Found"),
  }
}

async function DynamicMarker() {
  await connection()
  return null
}

export default function page() {
  return (
    <>
      <NotFoundPage />
      <Suspense>
        <DynamicMarker />
      </Suspense>
    </>
  )
}
