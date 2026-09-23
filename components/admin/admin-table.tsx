"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  MoreVerticalIcon,
  ShieldAlertIcon,
  UserCheckIcon,
  UsersIcon,
  UserXIcon,
} from "lucide-react"
import { useExtracted } from "next-intl"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BanUserForm } from "@/components/admin/ban-user-form"
import { DeleteUser } from "@/components/admin/delete-user"
import { SetUserPasswordForm } from "@/components/admin/set-user-password-form"
import { useUser } from "@/contexts/user-context"
import { useFormatDate } from "@/hooks/use-format-date"
import { authClient } from "@/lib/auth-client"
import type { AuthErrorCode, User } from "@/lib/definitions"

interface AdminTableProps {
  filteredUsers: User[]
  allUsersCount?: number
}

export function AdminTable({
  filteredUsers,
  allUsersCount = 0,
}: AdminTableProps) {
  const t = useExtracted()
  const router = useRouter()
  const { user: currentUser } = useUser()
  const formatDate = useFormatDate()
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isBanOpen, setIsBanOpen] = useState<boolean>(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState<boolean>(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false)

  async function handleImpersonate(targetUser: User) {
    setImpersonatingId(targetUser.id)

    authClient.admin.impersonateUser({
      userId: targetUser.id,
      fetchOptions: {
        onError: (ctx) => {
          switch (ctx.error.code as AuthErrorCode) {
            case "BANNED_USER":
              toast.error(t("This user has been banned."))
              break
            default:
              toast.error(
                t("Failed to impersonate user! Please try again later.")
              )
              break
          }
        },
        onSuccess: () => {
          router.push("/home")
          router.refresh()
          toast.success(t("Now impersonating") + ` ${targetUser.name}`)
        },
      },
    })

    setImpersonatingId(null)
  }

  return (
    <>
      <Card className="flex-1 overflow-auto">
        <CardContent className="h-full">
          {filteredUsers.length === 0 ? (
            <Empty className="h-full border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersIcon />
                </EmptyMedia>
                <EmptyTitle>{t("No users found")}</EmptyTitle>
                <EmptyDescription>
                  {allUsersCount === 0
                    ? t("There are no users registered yet.")
                    : t("No users match the selected search query or filters.")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="table-wrapper md:max-h-90 lg:max-h-none">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-1">
                  <TableRow className="[&>th]:text-center">
                    <TableHead>{t("User")}</TableHead>
                    <TableHead>{t("Email")}</TableHead>
                    <TableHead>{t("Role")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead>{t("Joined Date")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser.id
                    const isBanned = Boolean(u.banned)
                    const isTargetAdmin = u.role === "admin"

                    const hideMenu = isSelf || isTargetAdmin

                    const canImpersonate =
                      !isSelf && !isTargetAdmin && impersonatingId !== u.id

                    const canBan = !isSelf && !isTargetAdmin
                    const canDelete = !isSelf && !isTargetAdmin
                    const canSetPassword = !isSelf && !isTargetAdmin

                    return (
                      <TableRow key={u.id} className="[&>td]:text-center">
                        <TableCell>
                          <div className="grid flex-1 leading-tight">
                            <span className="font-semibold">{u.name}</span>
                            {u.username && (
                              <span className="text-muted-foreground text-xs">
                                @{u.username}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-sm">{u.email}</span>
                            {u.emailVerified ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="badge-green px-1 py-0 text-[10px]"
                                  >
                                    {t("Verified")}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("Email address is verified")}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="badge-gray px-1 py-0 text-[10px]"
                                  >
                                    {t("Unverified")}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("Email address is not yet verified")}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {u.role === "admin" ? (
                            <Badge className="border-purple-600/40 bg-purple-600/15 text-purple-700 dark:text-purple-300">
                              <ShieldAlertIcon className="mr-1 size-3" />
                              {t("Admin")}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">{t("User")}</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {isBanned ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="badge-red">
                                  <UserXIcon className="mr-1 size-3" />
                                  {t("Banned")}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <p className="font-semibold">
                                    {u.banReason || t("No reason")}
                                  </p>
                                  {u.banExpires && (
                                    <p className="text-muted-foreground">
                                      {t("Expires")}: {formatDate(u.banExpires)}
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge className="badge-green">
                              <UserCheckIcon className="mr-1 size-3" />
                              {t("Active")}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(new Date(u.createdAt))}
                        </TableCell>

                        <TableCell>
                          {!hideMenu && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  className="dark:hover:bg-input/50"
                                  variant="ghost"
                                  size="icon"
                                >
                                  <MoreVerticalIcon />
                                  <span className="sr-only">
                                    {t("Open menu")}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => handleImpersonate(u)}
                                  disabled={!canImpersonate}
                                >
                                  {t("Impersonate")}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setSelectedUser(u)
                                    setIsPasswordOpen(true)
                                  }}
                                  disabled={!canSetPassword}
                                >
                                  {t("Reset Password")}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setSelectedUser(u)
                                    setIsBanOpen(true)
                                  }}
                                  disabled={!canBan}
                                >
                                  {isBanned ? t("Unban") : t("Ban")}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  variant="destructive"
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setSelectedUser(u)
                                    setIsDeleteOpen(true)
                                  }}
                                  disabled={!canDelete}
                                >
                                  {t("Delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <>
          <BanUserForm
            key={selectedUser.id + "BanUserForm"}
            user={selectedUser}
            isOpen={isBanOpen}
            setIsOpen={setIsBanOpen}
          />
          <SetUserPasswordForm
            key={selectedUser.id + "SetUserPasswordForm"}
            user={selectedUser}
            isOpen={isPasswordOpen}
            setIsOpen={setIsPasswordOpen}
          />
          <DeleteUser
            key={selectedUser.id + "DeleteUser"}
            user={selectedUser}
            isOpen={isDeleteOpen}
            setIsOpen={setIsDeleteOpen}
          />
        </>
      )}
    </>
  )
}
