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
import type { NameFormValues } from "@/schemas/types"

export function ChangeNameForm() {
  const t = useExtracted()
  const { createNameSchema } = useSchemas()
  const router = useRouter()
  const { user } = useUser()
  const form = useForm<NameFormValues>({
    resolver: zodResolver(createNameSchema()),
    defaultValues: {
      name: user.name,
    },
  })
  const [isOpen, setIsOpen] = useState<boolean>(false)

  async function onSubmit(values: NameFormValues) {
    try {
      await authClient.updateUser({
        name: values.name,
        fetchOptions: {
          onError: () => {
            toast.error(t("Failed to update name! Please try again later."))
          },
          onSuccess: () => {
            setIsOpen(false)
            toast.success(t("Your name has been updated."))
            router.refresh()
            form.reset({ name: values.name })
          },
        },
      })
    } catch {
      toast.error(t("Failed to update name! Please try again later."))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("Change Name")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Change Name")}</DialogTitle>
          <DialogDescription>
            {t("Update your display name.")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-name">{t("Name")}</FormLabel>
                  <FormControl>
                    <Input
                      id="form-name"
                      placeholder={t("Enter your name...")}
                      autoComplete="name"
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
