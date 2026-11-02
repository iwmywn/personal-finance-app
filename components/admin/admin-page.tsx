"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import type { AdminStats } from "@/actions/admin.actions"
import { AdminFilters } from "@/components/admin/admin-filters"
import { CreateUserForm } from "@/components/admin/create-user-form"
import { PageLayout } from "@/components/layout/page-layout"
import { Button } from "@/components/ui/button"
import type { User } from "@/lib/definitions"

interface AdminPageProps {
  initialStats: AdminStats
  initialUsers: User[]
}

export default function AdminPage({
  initialStats,
  initialUsers,
}: AdminPageProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <PageLayout
        title={t("Admin Management")}
        description={t(
          "Manage application users, system roles, bans, sessions, and security."
        )}
        action={<Button onClick={() => setIsOpen(true)}>{t("Add")}</Button>}
      >
        <AdminFilters initialStats={initialStats} initialUsers={initialUsers} />
      </PageLayout>

      <CreateUserForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
