import { createEnv } from "@t3-oss/env-nextjs"
import * as z from "zod"

export const clientEnv = createEnv({
  client: {
    NEXT_PUBLIC_URL: z.string().min(1),
    NEXT_PUBLIC_NODE_ENV: z.string().min(1),
    NEXT_PUBLIC_RECAPTCHA: z.string().min(1),
    NEXT_PUBLIC_DISABLE_CAPTCHA: z.string().optional(),
  },
  createFinalSchema: (shape) =>
    z
      .object(shape)
      .refine(
        (env) =>
          !(
            env.NEXT_PUBLIC_NODE_ENV === "production" &&
            env.NEXT_PUBLIC_DISABLE_CAPTCHA === "true"
          ),
        {
          message:
            "NEXT_PUBLIC_DISABLE_CAPTCHA cannot be enabled in production",
          path: ["NEXT_PUBLIC_DISABLE_CAPTCHA"],
        }
      ),
  runtimeEnv: {
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    NEXT_PUBLIC_NODE_ENV: process.env.NEXT_PUBLIC_NODE_ENV,
    NEXT_PUBLIC_RECAPTCHA: process.env.NEXT_PUBLIC_RECAPTCHA,
    NEXT_PUBLIC_DISABLE_CAPTCHA: process.env.NEXT_PUBLIC_DISABLE_CAPTCHA,
  },
})

export function isCaptchaDisabled(): boolean {
  return clientEnv.NEXT_PUBLIC_DISABLE_CAPTCHA === "true"
}
