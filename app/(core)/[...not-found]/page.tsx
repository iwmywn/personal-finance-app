import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { GhostIcon } from "lucide-react"
import { getExtracted } from "next-intl/server"

import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"

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

export default async function page() {
  const t = await getExtracted()

  return (
    <>
      <EmptyState
        className="mt-3"
        icon={<GhostIcon />}
        title={t("Page not found")}
        description={t("The page you are looking for does not exist.")}
        action={
          <Button asChild>
            <Link href="/home">{t("Back to Home")}</Link>
          </Button>
        }
      />
      <Suspense>
        <DynamicMarker />
      </Suspense>
    </>
  )
}
