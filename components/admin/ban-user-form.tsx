"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useExtracted } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormButton,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useFormatDate } from "@/hooks/use-format-date"
import { useSchemas } from "@/hooks/use-schemas"
import { authClient } from "@/lib/auth-client"
import type { User } from "@/lib/definitions"
import type { AdminBanFormValues } from "@/schemas/types"

interface BanUserFormProps {
  user: User
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function BanUserForm({ user, isOpen, setIsOpen }: BanUserFormProps) {
  const t = useExtracted()
  const router = useRouter()
  const formatDate = useFormatDate()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const isBanned = Boolean(user.banned)
  const { createAdminBanSchema } = useSchemas()
  const form = useForm<AdminBanFormValues>({
    resolver: zodResolver(createAdminBanSchema()),
    defaultValues: {
      banReason: "",
      duration: "permanent",
    },
  })

  async function handleUnban() {
    setIsSubmitting(true)

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
            router.refresh()
            toast.success(t("User has been unbanned."))
            setIsOpen(false)
          },
        },
      })
      setIsSubmitting(false)
    } catch {
      setIsSubmitting(false)
      toast.error(t("Failed to update ban status! Please try again later."))
    }
  }

  async function onSubmit(values: AdminBanFormValues) {
    const expiresInSeconds =
      values.duration === "permanent" ? undefined : Number(values.duration)

    setIsSubmitting(true)

    try {
      await authClient.admin.banUser({
        userId: user.id,
        banReason: values.banReason?.trim() || undefined,
        banExpiresIn: expiresInSeconds,
        fetchOptions: {
          onError: () => {
            toast.error(t("Failed to ban user! Please try again later."))
          },
          onSuccess: () => {
            setIsOpen(false)
            toast.success(t("User has been banned."))
            router.refresh()
            form.reset()
          },
        },
      })
      setIsSubmitting(false)
    } catch {
      setIsSubmitting(false)
      toast.error(t("Failed to ban user! Please try again later."))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isBanned ? t("Unban User") : t("Ban User")}
          </DialogTitle>
          <DialogDescription>
            {isBanned
              ? t("Restore access for") + ` ${user.name} (${user.email}).`
              : t(
                  "Prevent this user from signing in and revoke all active sessions."
                )}
          </DialogDescription>
        </DialogHeader>

        {isBanned ? (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                {t("Current ban reason")}:{" "}
                {user.banReason || t("No reason specified")}
              </p>
              {user.banExpires && (
                <p className="text-muted-foreground mt-1">
                  {t("Expires on")}: {formatDate(user.banExpires)}
                </p>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t("Cancel")}</Button>
              </DialogClose>
              <Button onClick={handleUnban} disabled={isSubmitting}>
                {isSubmitting && <Spinner />}
                {t("Unban")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="banReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="form-ban-reason">
                      {t("Ban Reason")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="form-ban-reason"
                        placeholder={t("e.g. Violation of terms of service")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="form-duration">
                      {t("Duration")}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger id="form-duration" className="w-full">
                          <SelectValue placeholder={t("Select ban duration")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="permanent">
                          {t("Permanent")}
                        </SelectItem>
                        <SelectItem value="86400">{t("24 Hours")}</SelectItem>
                        <SelectItem value="604800">{t("7 Days")}</SelectItem>
                        <SelectItem value="2592000">{t("30 Days")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("Cancel")}</Button>
                </DialogClose>
                <FormButton variant="destructive" isSubmitting={isSubmitting}>
                  {t("Ban")}
                </FormButton>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
