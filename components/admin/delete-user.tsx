"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useExtracted } from "next-intl"
import { toast } from "sonner"

import { deleteUser } from "@/actions/admin.actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import type { User } from "@/lib/definitions"

interface DeleteUserProps {
  user: User
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function DeleteUser({ user, isOpen, setIsOpen }: DeleteUserProps) {
  const t = useExtracted()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()

    startTransition(async () => {
      try {
        const { error, success } = await deleteUser(user.id)

        if (success === undefined) {
          toast.error(error)
        } else {
          setIsOpen(false)
          toast.success(success)
          router.refresh()
        }
      } catch {
        toast.error(t("Failed to delete user! Please try again later."))
      }
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Delete User Account")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "Are you sure you want to permanently delete this user account?"
            )}{" "}
            <strong>
              {user.name} ({user.email})
            </strong>
            .{" "}
            {t(
              "All associated data will be permanently deleted. This action cannot be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending && <Spinner className="size-4" />}
            {t("Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
