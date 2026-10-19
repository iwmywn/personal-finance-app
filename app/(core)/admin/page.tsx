import type { Metadata } from "next"
import { GhostIcon } from "lucide-react"
import { getExtracted } from "next-intl/server"

import { getAdminData } from "@/actions/admin.actions"
import AdminPage from "@/components/admin/admin-page"
import { EmptyState } from "@/components/empty-state"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getExtracted()

  return {
    title: t("Admin Management"),
  }
}

export default async function page() {
  const t = await getExtracted()
  const { error, stats, users } = await getAdminData()

  if (!stats || !users) {
    return (
      <EmptyState
        className="mt-3"
        icon={<GhostIcon />}
        title={t("Cannot fetch users data")}
        description={error ?? t("Please try again later.")}
      />
    )
  }

  return <AdminPage initialStats={stats} initialUsers={users} />
}
