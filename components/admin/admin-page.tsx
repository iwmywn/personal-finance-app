"use client"

import { useState } from "react"
import { useExtracted } from "next-intl"

import type { AdminStats } from "@/actions/admin.actions"
import { Button } from "@/components/ui/button"
import { AdminFilters } from "@/components/admin/admin-filters"
import { CreateUserForm } from "@/components/admin/create-user-form"
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
      <div className="page-content md:h-auto lg:h-[calc(100vh-4.375rem)]">
        <div className="header">
          <div>
            <div className="title">{t("Admin Management")}</div>
            <div className="description">
              {t(
                "Manage application users, system roles, bans, sessions, and security."
              )}
            </div>
          </div>
          <Button onClick={() => setIsOpen(true)}>{t("Create")}</Button>
        </div>

        <AdminFilters initialStats={initialStats} initialUsers={initialUsers} />
      </div>

      <CreateUserForm isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}
