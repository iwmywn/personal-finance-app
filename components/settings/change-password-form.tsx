"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useExtracted } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PasswordInput } from "@/components/password-input"
import { useSchemas } from "@/hooks/use-schemas"
import { authClient } from "@/lib/auth-client"
import type { AuthErrorCode } from "@/lib/definitions"
import type { PasswordFormValues } from "@/schemas/types"

export function ChangePasswordForm() {
  const t = useExtracted()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const { createPasswordSchema } = useSchemas()
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(createPasswordSchema()),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      revokeOtherSessions: false,
    },
  })

  async function onSubmit(values: PasswordFormValues) {
    try {
      await authClient.changePassword({
        newPassword: values.newPassword,
        currentPassword: values.currentPassword,
        revokeOtherSessions: values.revokeOtherSessions,
        fetchOptions: {
          onError: (ctx) => {
            switch (ctx.error.code as AuthErrorCode) {
              case "INVALID_PASSWORD":
                toast.error(t("Current password is incorrect!"))
                break
              default:
                if (ctx.response.status === 429) {
                  toast.error(
                    t("Rate limit exceeded! Retry after {seconds} seconds.", {
                      seconds:
                        ctx.response.headers.get("X-Retry-After") ?? "10",
                    })
                  )
                } else {
                  toast.error(
                    t("Failed to update password! Please try again later.")
                  )
                }
                break
            }
          },
          onSuccess: () => {
            setIsOpen(false)
            toast.success(t("Your password has been changed."))
            router.refresh()
            form.reset()
          },
        },
      })
    } catch {
      toast.error(t("Failed to update password! Please try again later."))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("Change Password")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Change Password")}</DialogTitle>
          <DialogDescription>{t("Update your password.")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-current-password">
                    {t("Current Password")}
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="form-current-password"
                      placeholder="********"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-new-password">
                    {t("New Password")}
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="form-new-password"
                      placeholder="********"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-confirm-password">
                    {t("Confirm Password")}
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="form-confirm-password"
                      placeholder="********"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="revokeOtherSessions"
              render={({ field }) => (
                <FormItem className="flex">
                  <FormControl>
                    <Checkbox
                      id="form-sign-out-all"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel htmlFor="form-sign-out-all">
                    {t("Sign out from all other devices.")}
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t("Cancel")}</Button>
              </DialogClose>
              <FormButton isSubmitting={form.formState.isSubmitting}>
                {t("Save")}
              </FormButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
