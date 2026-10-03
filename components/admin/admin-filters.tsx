"use client"

import { useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import type { AdminStats } from "@/actions/admin.actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminSummary } from "@/components/admin/admin-summary"
import { AdminTable } from "@/components/admin/admin-table"
import type { User } from "@/lib/definitions"
import { filterUsers } from "@/lib/filters"

interface AdminFiltersProps {
  initialStats: AdminStats
  initialUsers: User[]
}

export function AdminFilters({
  initialStats,
  initialUsers,
}: AdminFiltersProps) {
  const t = useExtracted()
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const hasActiveFilters =
    searchTerm !== "" || filterRole !== "all" || filterStatus !== "all"

  const handleResetFilters = () => {
    setSearchTerm("")
    setFilterRole("all")
    setFilterStatus("all")
  }

  const filteredUsers = filterUsers(initialUsers, {
    searchTerm,
    filterRole,
    filterStatus,
  })

  return (
    <>
      <Card>
        <CardContent>
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              hasActiveFilters
                ? "lg:grid-cols-[1fr_1fr_1fr_auto]"
                : "lg:grid-cols-[1fr_1fr_1fr]"
            } gap-4`}
          >
            <InputGroup
              className={`sm:col-span-full lg:col-auto ${searchTerm !== "" && "border-primary"}`}
            >
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t("Search by name, email or username...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => setSearchTerm("")}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>

            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger
                className={`w-full ${filterRole !== "all" && "border-primary"}`}
              >
                <SelectValue placeholder={t("Role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Roles")}</SelectItem>
                <SelectItem value="admin">{t("Admin")}</SelectItem>
                <SelectItem value="user">{t("User")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger
                className={`w-full ${filterStatus !== "all" && "border-primary"}`}
              >
                <SelectValue placeholder={t("Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Status")}</SelectItem>
                <SelectItem value="active">{t("Active")}</SelectItem>
                <SelectItem value="banned">{t("Banned")}</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="sm:col-span-2 lg:col-span-1"
              >
                {t("Reset")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AdminSummary stats={initialStats} />

      <AdminTable
        filteredUsers={filteredUsers}
        allUsersCount={initialUsers.length}
      />
    </>
  )
}
