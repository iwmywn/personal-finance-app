"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useExtracted } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogCancel,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { useFormatDate } from "@/hooks/use-format-date"
import { authClient } from "@/lib/auth-client"
import type { User } from "@/lib/definitions"

interface UnbanUserFormProps {
  user: User
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function UnbanUserForm({ user, isOpen, setIsOpen }: UnbanUserFormProps) {
  const t = useExtracted()
  const router = useRouter()
  const formatDate = useFormatDate()
  const [isPending, startTransition] = useTransition()

  async function handleUnban() {
    startTransition(async () => {
      try {
        await authClient.admin.unbanUser({
          userId: user.id,
          fetchOptions: {
            onError: () => {
              toast.error(
                t("Failed to update ban status! Please try again later.")
              )
            },
            onSuccess: () => {
              setIsOpen(false)
              toast.success(t("User has been unbanned."))
              router.refresh()
            },
          },
        })
      } catch {
        toast.error(t("Failed to update ban status! Please try again later."))
      }
    })
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isPending) setIsOpen(open)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Unban User")}</DialogTitle>
          <DialogDescription>
            {t("Restore access for") + ` ${user.name} (${user.email}).`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Item className="p-0">
            <ItemContent>
              <ItemTitle>
                {t("Current ban reason")}: {user.banReason || t("No reason")}
              </ItemTitle>
              {user.banExpires && (
                <ItemDescription>
                  {t("Expires on")}: {formatDate(user.banExpires)}
                </ItemDescription>
              )}
            </ItemContent>
          </Item>

          <DialogFooter>
            <DialogCancel disabled={isPending}>{t("Cancel")}</DialogCancel>
            <Button onClick={handleUnban} disabled={isPending}>
              {isPending && <Spinner />}
              {t("Unban")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
