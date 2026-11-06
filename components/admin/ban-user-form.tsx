"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useExtracted } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

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
  const { createAdminBanSchema } = useSchemas()
  const banSchema = createAdminBanSchema()
  const form = useForm<AdminBanFormValues>({
    resolver: (values, context, options) => {
      const normalizedValues: AdminBanFormValues = {
        ...values,
        banReason: values.banReason?.trim() || undefined,
      }
      return zodResolver(banSchema)(normalizedValues, context, options)
    },
    defaultValues: {
      banReason: "",
      duration: "permanent",
    },
  })

  async function handleBan(values: AdminBanFormValues) {
    const expiresInSeconds =
      values.duration === "permanent" ? undefined : Number(values.duration)

    try {
      await authClient.admin.banUser({
        userId: user.id,
        // Do not use Better Auth's default ban reason; fallback to localized "No reason"
        // in the admin's current language.
        // [See official docs](https://better-auth.com/docs/plugins/admin#default-ban-reason)
        banReason: values.banReason?.trim() || t("No reason"),
        banExpiresIn: expiresInSeconds,
        fetchOptions: {
          onError: () => {
            toast.error(t("Failed to ban user! Please try again later."))
          },
          onSuccess: () => {
            setIsOpen(false)
            form.reset()
            router.refresh()
            toast.success(t("User has been banned."))
          },
        },
      })
    } catch {
      toast.error(t("Failed to ban user! Please try again later."))
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!form.formState.isSubmitting) setIsOpen(open)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Ban User")}</DialogTitle>
          <DialogDescription>
            {t(
              "Prevent this user from signing in and revoke all active sessions."
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleBan)} className="space-y-4">
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
                  <FormLabel htmlFor="form-duration">{t("Duration")}</FormLabel>
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
              <DialogCancel disabled={form.formState.isSubmitting}>
                {t("Cancel")}
              </DialogCancel>
              <FormButton
                variant="destructive"
                isSubmitting={form.formState.isSubmitting}
              >
                {t("Ban")}
              </FormButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
