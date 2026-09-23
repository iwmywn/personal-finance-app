"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlertIcon } from "lucide-react"
import { useExtracted } from "next-intl"
import { toast } from "sonner"

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
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useUser } from "@/contexts/user-context"
import { authClient } from "@/lib/auth-client"

export function StopImpersonation() {
  const t = useExtracted()
  const router = useRouter()
  const userContext = useUser()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState<boolean>(false)

  if (!userContext.session.impersonatedBy) {
    return null
  }

  const { user } = userContext

  async function onStopImpersonating(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()

    startTransition(async () => {
      try {
        await authClient.admin.stopImpersonating({
          fetchOptions: {
            onError: () => {
              toast.error(
                t("Failed to stop impersonating! Please try again later.")
              )
            },
            onSuccess: () => {
              setIsOpen(false)
              toast.success("Stopped impersonation session.")
              router.push("/admin")
              router.refresh()
            },
          },
        })
      } catch {
        toast.error(t("Failed to stop impersonating! Please try again later."))
      }
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("Impersonating") + " " + user.name}
              className="relative size-8 cursor-pointer text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            >
              <ShieldAlertIcon className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-500" />
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {t("Impersonating")} {user.name}
        </TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("Stop impersonating this user?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("You are currently impersonating")}{" "}
            <strong>
              {user.name} ({user.email})
            </strong>
            .{" "}
            {t(
              "Stopping will restore your admin session and redirect you back to the admin panel."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onStopImpersonating}>
            {isPending && <Spinner />} {t("Stop Impersonating")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
