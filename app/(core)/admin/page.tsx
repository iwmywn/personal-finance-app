import type { Metadata } from "next"
import { getExtracted } from "next-intl/server"

import { getAdminData } from "@/actions/admin.actions"
import AdminPage from "@/components/admin/admin-page"
import { ErrorEmptyState } from "@/components/layout/error-empty-state"

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
      <ErrorEmptyState
        title={t("CANNOT FETCH USERS DATA")}
        description={error}
      />
    )
  }

  return <AdminPage initialStats={stats} initialUsers={users} />
}
