"use client"

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
import { PasswordInput } from "@/components/password-input"
import { useSchemas } from "@/hooks/use-schemas"
import { authClient } from "@/lib/auth-client"
import type { AuthErrorCode } from "@/lib/definitions"
import { DEFAULT_ROLE } from "@/lib/role"
import type { AdminUserFormValues } from "@/schemas/types"

interface CreateUserFormProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function CreateUserForm({ isOpen, setIsOpen }: CreateUserFormProps) {
  const t = useExtracted()
  const router = useRouter()
  const { createAdminUserSchema } = useSchemas()

  const form = useForm<AdminUserFormValues>({
    resolver: zodResolver(createAdminUserSchema()),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      role: DEFAULT_ROLE,
    },
  })

  async function onSubmit(values: AdminUserFormValues) {
    try {
      const { data: response, error: usernameError } =
        await authClient.isUsernameAvailable({
          username: values.username,
        })

      if (usernameError || !response) {
        toast.error(
          t("Failed to check username availability! Please try again later.")
        )
        return
      }

      if (!response.available) {
        toast.error(t("This username is already taken."))
        return
      }

      await authClient.admin.createUser({
        name: values.name,
        email: values.email,
        password: values.password,
        role: "user",
        data: {
          username: values.username,
          emailVerified: true,
        },
        fetchOptions: {
          onError: (ctx) => {
            switch (ctx.error.code as AuthErrorCode) {
              case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
                toast.error(t("This email is already in use."))
                break
              default:
                toast.error(t("Failed to create user! Please try again later."))
                break
            }
          },
          onSuccess: () => {
            setIsOpen(false)
            toast.success(t("User has been created."))
            router.refresh()
            form.reset()
          },
        },
      })
    } catch {
      toast.error(t("Failed to create user! Please try again later."))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Create New User")}</DialogTitle>
          <DialogDescription>
            {t("Add a new user account with credentials.")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-fullname">
                    {t("Full Name")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="form-fullname"
                      placeholder={t("e.g. John Doe")}
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-username">{t("Username")}</FormLabel>
                  <FormControl>
                    <Input
                      id="form-username"
                      placeholder={t("e.g. johndoe")}
                      autoComplete="username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-email">{t("Email")}</FormLabel>
                  <FormControl>
                    <Input
                      id="form-email"
                      type="email"
                      placeholder={t("e.g. john@example.com")}
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-password">{t("Password")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="form-password"
                      placeholder="********"
                      autoComplete="new-password"
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
                {t("Create")}
              </FormButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
