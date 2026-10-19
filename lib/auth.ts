import "server-only"

import { mongodbAdapter } from "@better-auth/mongo-adapter"
import { betterAuth } from "better-auth/minimal"
import { nextCookies } from "better-auth/next-js"
import { admin, captcha, twoFactor, username } from "better-auth/plugins"
import * as z from "zod"

import { siteConfig } from "@/app/pfa.config"
import { clientEnv } from "@/env/client"
import { serverEnv } from "@/env/server"
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/config"
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currency"
import { connect } from "@/lib/db"
import { ASSIGNABLE_ROLES, DEFAULT_ROLE } from "@/lib/role"

export const auth = betterAuth({
  appName: siteConfig.name,
  database: mongodbAdapter(await connect()),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: true,
  },
  account: {
    modelName: "accounts",
  },
  session: {
    modelName: "sessions",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 0,
  },
  user: {
    modelName: "users",
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: DEFAULT_ROLE,
        validator: {
          input: z.enum(ASSIGNABLE_ROLES),
        },
      },
      locale: {
        type: "string",
        required: true,
        defaultValue: DEFAULT_LOCALE,
        validator: {
          input: z.enum(LOCALES),
        },
      },
      currency: {
        type: "string",
        required: true,
        defaultValue: DEFAULT_CURRENCY,
        validator: {
          input: z.enum(CURRENCIES),
        },
      },
    },
  },
  verification: {
    modelName: "verifications",
  },
  plugins: [
    admin(),
    captcha({
      provider: "google-recaptcha",
      secretKey: serverEnv.RECAPTCHA_SECRET,
      endpoints: ["/sign-in/username", "/sign-in/email"],
      minScore: 0.5,
    }),
    twoFactor({
      schema: {
        twoFactor: {
          modelName: "twoFactors",
        },
      },
    }),
    username(),
    nextCookies(),
  ],
  advanced: {
    cookiePrefix: siteConfig.name,
    database: {
      generateId: false,
      joins: true,
    },
  },
  rateLimit: {
    modelName: "rateLimits",
    storage: "database",
    enabled: clientEnv.NEXT_PUBLIC_NODE_ENV === "production",
    customRules: {
      "/sign-in/username": {
        window: 60,
        max: 5,
      },
      "/sign-in/email": {
        window: 60,
        max: 5,
      },
    },
  },
  secret: serverEnv.BETTER_AUTH_SECRET,
  trustedOrigins: [clientEnv.NEXT_PUBLIC_URL],
  baseURL: clientEnv.NEXT_PUBLIC_URL,
})
