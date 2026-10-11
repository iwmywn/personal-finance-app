"use client"

import type { Route } from "next"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useExtracted } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { signInRoute } from "@/routes"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormButton,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useSchemas } from "@/hooks/use-schemas"
import type { Locale } from "@/i18n/config"
import { setUserLocale } from "@/i18n/locale"
import { authClient } from "@/lib/auth-client"
import type { AuthErrorCode } from "@/lib/definitions"
import { getSafeCallbackUrl } from "@/lib/utils"
import type { TwoFactorCodeFormValues } from "@/schemas/types"

export function TwoFactorForm() {
  const t = useExtracted()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { createTwoFactorCodeSchema } = useSchemas()
  const form = useForm<TwoFactorCodeFormValues>({
    resolver: zodResolver(createTwoFactorCodeSchema()),
    defaultValues: { code: "", trustDevice: false },
  })

  async function onSubmit(values: TwoFactorCodeFormValues) {
    try {
      await authClient.twoFactor.verifyTotp({
        code: values.code,
        trustDevice: values.trustDevice,
        fetchOptions: {
          onError: (ctx) => {
            const callbackUrl = getSafeCallbackUrl(searchParams.get("next"))
            const signInUrl: Route = searchParams.has("next")
              ? `${signInRoute}?${new URLSearchParams({ next: callbackUrl }).toString()}`
              : signInRoute

            switch (ctx.error.code as AuthErrorCode) {
              case "INVALID_CODE":
                toast.error(t("Invalid authentication code!"))
                break
              case "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE":
                toast.error(t("Too many attempts. Please sign in again."))
                router.replace(signInUrl)
                form.reset()
                break
              case "INVALID_TWO_FACTOR_COOKIE":
                toast.error(
                  t("Two-factor session has expired. Please sign in again.")
                )
                router.replace(signInUrl)
                form.reset()
                break
              case "ACCOUNT_TEMPORARILY_LOCKED":
                toast.error(
                  t(
                    "Your account is temporarily locked due to too many failed attempts. Please try again later."
                  )
                )
                router.replace(signInUrl)
                form.reset()
                break
              default:
                toast.error(
                  t("Failed to verify 2FA code! Please try again later.")
                )
                break
            }
          },
          onSuccess: async () => {
            const callbackUrl = getSafeCallbackUrl(searchParams.get("next"))

            router.replace(callbackUrl)
            router.refresh()
            form.reset()

            await authClient.getSession({
              fetchOptions: {
                onSuccess: async (ctx) => {
                  await setUserLocale(ctx.data.user.locale as Locale)
                },
              },
            })
          },
        },
      })
    } catch {
      toast.error(t("Failed to verify 2FA code! Please try again later."))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Two-Factor Authentication")}</CardTitle>
        <CardDescription>
          {t("Enter the code from your authenticator app.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
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

            <FormField
              control={form.control}
              name="trustDevice"
              render={({ field }) => (
                <FormItem className="flex flex-row space-y-0 space-x-3 border p-3">
                  <FormControl>
                    <Checkbox
                      id="form-trust-this-device"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel htmlFor="form-trust-this-device">
                      {t("Trust this device")}
                    </FormLabel>
                    <FormDescription>
                      {t("Don't ask for 2FA code on this device for 30 days.")}
                    </FormDescription>
                  </div>
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
      </CardContent>
    </Card>
  )
}
