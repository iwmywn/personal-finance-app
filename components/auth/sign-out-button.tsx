"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"
import { useExtracted } from "next-intl"
import { toast } from "sonner"

import { signInRoute } from "@/routes"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { useUser } from "@/contexts/user-context"
import { authClient } from "@/lib/auth-client"

export function SignOutButton() {
  const router = useRouter()
  const t = useExtracted()
  const { session } = useUser()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState<boolean>(false)

  async function onSignOut(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()

    startTransition(async () => {
      try {
        if (session.impersonatedBy) {
          await authClient.admin.stopImpersonating()
        }
        await authClient.signOut({
          fetchOptions: {
            onError: () => {
              toast.error(t("Failed to sign out! Please try again later."))
            },
            onSuccess: () => {
              setIsOpen(false)
              toast.success(t("Signed out."))
              router.push(signInRoute)
              router.refresh()
            },
          },
        })
      } catch {
        toast.error(t("Failed to sign out! Please try again later."))
      }
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <SidebarMenuButton tooltip={t("Sign Out")}>
          <LogOutIcon />
          {t("Sign Out")}
        </SidebarMenuButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("Are you sure you want to sign out?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("You will need to sign in again to access your account.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onSignOut}>
            {isPending && <Spinner />}
            {t("Sign Out")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
