"use client"

import type { Route } from "next"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useExtracted } from "next-intl"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { twoFactorRoute } from "@/routes"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import type { Locale } from "@/i18n/config"
import { setUserLocale } from "@/i18n/locale"
import { authClient } from "@/lib/auth-client"
import type { AuthErrorCode } from "@/lib/definitions"
import { getSafeCallbackUrl } from "@/lib/utils"
import type { SignInFormValues } from "@/schemas/types"

import { LanguageSelector } from "./language-selector"

export function SignInForm() {
  const t = useExtracted()
  const { createSignInSchema } = useSchemas()
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(createSignInSchema()),
    defaultValues: {
      username: "",
      password: "",
    },
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const { executeRecaptcha } = useGoogleReCaptcha()

  async function onSubmit(values: SignInFormValues) {
    try {
      if (!executeRecaptcha) {
        toast.error(t("CAPTCHA verification failed! Please try again later."))
        return
      }

      const token = await executeRecaptcha("sign_in")

      await authClient.signIn.username({
        username: values.username,
        password: values.password,
        fetchOptions: {
          headers: {
            "x-captcha-response": token,
          },
          onError: (ctx) => {
            switch (ctx.error.code as AuthErrorCode) {
              case "VERIFICATION_FAILED":
                toast.error(t("CAPTCHA verification failed!"))
                break
              case "INVALID_USERNAME_OR_PASSWORD":
                toast.error(t("Invalid username or password!"))
                break
              case "EMAIL_NOT_VERIFIED":
                toast.error(t("Email not verified!"))
                break
              case "BANNED_USER":
                toast.error(
                  t(
                    "Your account has been banned. Please contact support if you believe this is an error."
                  )
                )
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
                  toast.error(t("Failed to sign in! Please try again later."))
                }
                break
            }
          },
          onSuccess: async (ctx) => {
            const callbackUrl = getSafeCallbackUrl(searchParams.get("next"))

            if (ctx.data.twoFactorRedirect) {
              const twoFactorUrl: Route = searchParams.has("next")
                ? `${twoFactorRoute}?${new URLSearchParams({ next: callbackUrl }).toString()}`
                : twoFactorRoute
              router.push(twoFactorUrl)
              form.reset()
              return
            }

            router.push(callbackUrl)
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
      toast.error(t("Failed to sign in! Please try again later."))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Sign In")}</CardTitle>
        <CardDescription>
          {t("Enter your username and password to sign in to your account.")}
        </CardDescription>
        <CardAction>
          <LanguageSelector />
        </CardAction>
      </CardHeader>
      <CardContent>
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
                      placeholder="admin"
                      type="text"
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
              {t("Sign In")}
            </FormButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
