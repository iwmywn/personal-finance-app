"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useExtracted } from "next-intl"
import { useForm } from "react-hook-form"
import QRCode from "react-qr-code"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/password-input"
import { useUser } from "@/contexts/user-context"
import { useSchemas } from "@/hooks/use-schemas"
import { authClient } from "@/lib/auth-client"
import type { AuthErrorCode } from "@/lib/definitions"
import type {
  TwoFactorCodeFormValues,
  TwoFactorPasswordFormValues,
} from "@/schemas/types"

export function TwoFactorManager() {
  const t = useExtracted()
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [totpURI, setTotpURI] = useState<string | null>(null)
  const secret = totpURI?.match(/secret=([^&]+)/)?.[1]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {user.twoFactorEnabled ? t("Disable 2FA") : t("Enable 2FA")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {!user.twoFactorEnabled ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("Enable Two-Factor Authentication")}</DialogTitle>
              <DialogDescription>
                {t("Scan the QR code with your authenticator app.")}
              </DialogDescription>
            </DialogHeader>
            {!totpURI ? (
              <EnableTwoFactorForm setTotpURI={setTotpURI} />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <QRCode value={totpURI} />
                </div>
                <div className="grid gap-2">
                  <Label>{t("Secret Key")}</Label>
                  <Input
                    value={secret}
                    readOnly
                    className="font-mono text-xs"
                    onFocus={(event) => event.target.select()}
                  />
                </div>

                <VerifyTwoFactorForm
                  setTotpURI={setTotpURI}
                  setIsOpen={setIsOpen}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("Disable Two-Factor Authentication")}
              </DialogTitle>
              <DialogDescription>
                {t("Enter your password to disable 2FA.")}
              </DialogDescription>
            </DialogHeader>
            <DisableTwoFactorForm setIsOpen={setIsOpen} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface EnableTwoFactorFormProps {
  setTotpURI: (uri: string | null) => void
}

function EnableTwoFactorForm({ setTotpURI }: EnableTwoFactorFormProps) {
  const t = useExtracted()
  const { createTwoFactorPasswordSchema } = useSchemas()
  const form = useForm<TwoFactorPasswordFormValues>({
    resolver: zodResolver(createTwoFactorPasswordSchema()),
    defaultValues: { password: "" },
  })

  async function onSubmit(values: TwoFactorPasswordFormValues) {
    try {
      await authClient.twoFactor.enable({
        password: values.password,
        fetchOptions: {
          onError: (ctx) => {
            switch (ctx.error.code as AuthErrorCode) {
              case "INVALID_PASSWORD":
                toast.error(t("Invalid password."))
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
                    t("Failed to enable 2FA! Please try again later.")
                  )
                }
                break
            }
          },
          onSuccess: (ctx) => {
            setTotpURI(ctx.data.totpURI)
            form.reset()
          },
        },
      })
    } catch {
      toast.error(t("Failed to enable 2FA! Please try again later."))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormButton
          isSubmitting={form.formState.isSubmitting}
          className="w-full"
        >
          {t("Enable 2FA")}
        </FormButton>
      </form>
    </Form>
  )
}

interface VerifyTwoFactorFormProps {
  setTotpURI: (uri: string | null) => void
  setIsOpen: (isOpen: boolean) => void
}

function VerifyTwoFactorForm({
  setTotpURI,
  setIsOpen,
}: VerifyTwoFactorFormProps) {
  const t = useExtracted()
  const router = useRouter()
  const { createTwoFactorCodeSchema } = useSchemas()
  const form = useForm<TwoFactorCodeFormValues>({
    resolver: zodResolver(createTwoFactorCodeSchema()),
    defaultValues: { code: "" },
  })

  async function onSubmit(values: TwoFactorCodeFormValues) {
    try {
      await authClient.twoFactor.verifyTotp({
        code: values.code,
        fetchOptions: {
          onError: (ctx) => {
            switch (ctx.error.code as AuthErrorCode) {
              case "INVALID_CODE":
                toast.error(t("Invalid authentication code!"))
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
                    t("Failed to verify 2FA code! Please try again later.")
                  )
                }
                break
            }
          },
          onSuccess: () => {
            setIsOpen(false)
            toast.success(t("Two-factor authentication is now enabled."))
            router.refresh()
            setTotpURI(null)
            form.reset()
          },
        },
      })
    } catch {
      toast.error(t("Failed to verify 2FA code! Please try again later."))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="form-verification-code">
                {t("Verification Code")}
              </FormLabel>
              <FormControl>
                <Input
                  id="form-verification-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormButton
          isSubmitting={form.formState.isSubmitting}
          className="w-full"
        >
          {t("Verify")}
        </FormButton>
      </form>
    </Form>
  )
}

interface DisableTwoFactorFormProps {
  setIsOpen: (isOpen: boolean) => void
}

function DisableTwoFactorForm({ setIsOpen }: DisableTwoFactorFormProps) {
  const t = useExtracted()
  const router = useRouter()
  const { createTwoFactorPasswordSchema } = useSchemas()
  const form = useForm<TwoFactorPasswordFormValues>({
    resolver: zodResolver(createTwoFactorPasswordSchema()),
    defaultValues: { password: "" },
  })

  async function onSubmit(values: TwoFactorPasswordFormValues) {
    try {
      await authClient.twoFactor.disable({
        password: values.password,
        fetchOptions: {
          onError: (ctx) => {
            switch (ctx.error.code as AuthErrorCode) {
              case "INVALID_PASSWORD":
                toast.error(t("Invalid password."))
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
                    t("Failed to disable 2FA! Please try again later.")
                  )
                  break
                }
            }
          },
          onSuccess: () => {
            setIsOpen(false)
            toast.success(t("Two-factor authentication is now disabled."))
            router.refresh()
            form.reset()
          },
        },
      })
    } catch {
      toast.error(t("Failed to disable 2FA! Please try again later."))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormButton
          isSubmitting={form.formState.isSubmitting}
          className="w-full"
        >
          {t("Disable 2FA")}
        </FormButton>
      </form>
    </Form>
  )
}
