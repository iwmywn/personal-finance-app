import type { Metadata } from "next"
import { getExtracted } from "next-intl/server"

import HomePage from "@/components/home/home-page"
import { PageDataProvider } from "@/components/layout/page-data-provider"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getExtracted()

  return { title: t("Home") }
}

export default function page() {
  return (
    <PageDataProvider transactions categories>
      <HomePage />
    </PageDataProvider>
  )
}
