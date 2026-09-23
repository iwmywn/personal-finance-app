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
import { Input } from "@/components/ui/input"
import { useUser } from "@/contexts/user-context"
import { useSchemas } from "@/hooks/use-schemas"
import { authClient } from "@/lib/auth-client"
import type { UsernameFormValues } from "@/schemas/types"

export function ChangeUsernameForm() {
  const t = useExtracted()
  const router = useRouter()
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const { createUsernameSchema } = useSchemas()
  const form = useForm<UsernameFormValues>({
    resolver: zodResolver(createUsernameSchema()),
    defaultValues: {
      username: user.username || "",
    },
  })

  async function onSubmit(values: UsernameFormValues) {
    try {
      const { data: response, error } = await authClient.isUsernameAvailable({
        username: values.username,
      })

      if (error || !response) {
        toast.error(
          t("Failed to check username availability! Please try again later.")
        )
      } else if (!response.available && user.username !== values.username) {
        toast.error(t("This username is already taken."))
      } else {
        await authClient.updateUser({
          username: values.username,
          fetchOptions: {
            onError: () => {
              toast.error(
                t("Failed to update username! Please try again later.")
              )
            },
            onSuccess: () => {
              setIsOpen(false)
              toast.success(t("Your username has been changed."))
              router.refresh()
              form.reset({ username: values.username })
            },
          },
        })
      }
    } catch {
      toast.error(t("Failed to update username! Please try again later."))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("Change Username")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Change Username")}</DialogTitle>
          <DialogDescription>
            {t("Update your unique username.")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-username">{t("Username")}</FormLabel>
                  <FormControl>
                    <Input
                      id="form-username"
                      placeholder={t("Enter your username...")}
                      autoComplete="username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
