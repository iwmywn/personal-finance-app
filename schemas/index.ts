import Decimal from "decimal.js"
import * as z from "zod"

import { CATEGORY_TYPES } from "@/lib/category"
import { CURRENCIES } from "@/lib/currency"
import { parseToUTCMidnight } from "@/lib/date"
import { ASSIGNABLE_ROLES } from "@/lib/role"
import type { SchemaMessages } from "@/schemas/messages"

export function buildSchemas(messages: SchemaMessages) {
  const basePasswordSchema = () =>
    z
      .string()
      .regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/, {
        message: messages.passwordFormat,
      })

  const baseUsernameSchema = () =>
    z
      .string()
      .min(3, { message: messages.usernameMinLength })
      .max(30, { message: messages.usernameMaxLength })
      .regex(/^[a-zA-Z0-9_.]+$/, {
        message: messages.usernameFormat,
      })

  const baseAmount = () =>
    z
      .string()
      .min(1, { message: messages.amountRequired })
      .regex(/^\d+(\.\d+)?$/, {
        message: messages.amountInvalidNumber,
      })
      .refine(
        (val) => {
          try {
            return new Decimal(val).gte("0.01")
          } catch {
            return false
          }
        },
        { message: messages.amountMin }
      )
      .refine(
        (val) => {
          try {
            return new Decimal(val).lte("100000000000")
          } catch {
            return false
          }
        },
        { message: messages.amountMax }
      )
      .transform((val) => new Decimal(val).toString())

  const baseDateSchema = (requiredMessage: string) =>
    z
      .date({ message: requiredMessage })
      .transform((date) => parseToUTCMidnight(date) ?? date)

  const baseOptionalDateSchema = () =>
    z
      .date()
      .transform((date) => parseToUTCMidnight(date) ?? date)
      .optional()

  const createSignInSchema = () =>
    z.object({
      username: z.string().min(1, { message: messages.usernameRequired }),
      password: basePasswordSchema(),
    })

  const createPasswordSchema = () =>
    z
      .object({
        currentPassword: z
          .string()
          .min(1, { message: messages.currentPasswordRequired }),
        newPassword: basePasswordSchema(),
        confirmPassword: z
          .string()
          .min(1, { message: messages.newPasswordRequired }),
        revokeOtherSessions: z.boolean(),
      })
      .superRefine((data, ctx) => {
        if (data.newPassword !== data.confirmPassword) {
          ctx.addIssue({
            path: ["confirmPassword"],
            message: messages.passwordsDoNotMatch,
            code: "custom",
          })
        }
      })

  const createTwoFactorPasswordSchema = () =>
    z.object({
      password: basePasswordSchema(),
    })

  const createTwoFactorCodeSchema = () =>
    z.object({
      code: z
        .string()
        .min(6, {
          message: messages.authenticatorCodeRequired,
        })
        .max(10, { message: messages.codeMaxLength })
        .regex(/^\d+$/, {
          message: messages.codeDigitsOnly,
        }),
      trustDevice: z.boolean().optional(),
    })

  const createNameSchema = () =>
    z.object({
      name: z
        .string()
        .min(1, { message: messages.nameRequired })
        .max(100, { message: messages.nameMaxLength })
        .regex(/^[\p{L}\s]+$/u, {
          message: messages.nameLettersOnly,
        }),
    })

  const createUsernameSchema = () =>
    z.object({
      username: baseUsernameSchema(),
    })

  const createTransactionSchema = () =>
    z.object({
      type: z.enum(CATEGORY_TYPES, {
        message: messages.transactionTypeRequired,
      }),
      categoryKey: z.string().min(1, { message: messages.categoryRequired }),
      currency: z.enum(CURRENCIES, {
        message: messages.currencyRequired,
      }),
      amount: baseAmount(),
      description: z
        .string()
        .trim()
        .min(1, {
          message: messages.descriptionRequired,
        })
        .max(200, {
          message: messages.descriptionMaxLength,
        }),
      date: baseDateSchema(messages.dateRequired).refine(
        (date) => {
          const earliestTimezoneDate = new Date(
            Date.now() + 14 * 60 * 60 * 1000
          )
          const maxAllowedMidnight = new Date(
            Date.UTC(
              earliestTimezoneDate.getUTCFullYear(),
              earliestTimezoneDate.getUTCMonth(),
              earliestTimezoneDate.getUTCDate()
            )
          )
          return date.getTime() <= maxAllowedMidnight.getTime()
        },
        {
          message: messages.dateCannotBeInFuture,
        }
      ),
    })

  const createCategorySchema = () =>
    z.object({
      type: z.enum(CATEGORY_TYPES, {
        message: messages.typeRequired,
      }),
      label: z
        .string()
        .trim()
        .min(1, { message: messages.categoryNameRequired })
        .max(50, {
          message: messages.categoryNameMaxLength,
        }),
      description: z
        .string()
        .trim()
        .min(1, { message: messages.descriptionRequired })
        .max(200, {
          message: messages.descriptionMaxLength,
        }),
    })

  const createBudgetSchema = () =>
    z
      .object({
        categoryKey: z.string().min(1, { message: messages.categoryRequired }),
        currency: z.enum(CURRENCIES, {
          message: messages.currencyRequired,
        }),
        allocatedAmount: baseAmount(),
        startDate: baseDateSchema(messages.startDateRequired),
        endDate: baseDateSchema(messages.endDateRequired),
      })
      .superRefine((data, ctx) => {
        if (data.endDate <= data.startDate) {
          ctx.addIssue({
            path: ["endDate"],
            message: messages.endDateAfterStartDate,
            code: "custom",
          })
        }
      })

  const createGoalSchema = () =>
    z
      .object({
        name: z
          .string()
          .trim()
          .min(1, { message: messages.goalNameRequired })
          .max(100, {
            message: messages.goalNameMaxLength,
          }),
        categoryKey: z.string().min(1, { message: messages.categoryRequired }),
        currency: z.enum(CURRENCIES, {
          message: messages.currencyRequired,
        }),
        targetAmount: baseAmount(),
        startDate: baseDateSchema(messages.startDateRequired),
        endDate: baseDateSchema(messages.endDateRequired),
      })
      .superRefine((data, ctx) => {
        if (data.endDate <= data.startDate) {
          ctx.addIssue({
            path: ["endDate"],
            message: messages.endDateAfterStartDate,
            code: "custom",
          })
        }
      })

  const createRecurringTransactionSchema = () =>
    z
      .object({
        type: z.enum(CATEGORY_TYPES, {
          message: messages.typeRequired,
        }),
        categoryKey: z.string().min(1, { message: messages.categoryRequired }),
        currency: z.enum(CURRENCIES, {
          message: messages.currencyRequired,
        }),
        amount: baseAmount(),
        description: z
          .string()
          .trim()
          .min(1, {
            message: messages.descriptionRequired,
          })
          .max(200, {
            message: messages.descriptionMaxLength,
          }),
        frequency: z.enum(
          [
            "daily",
            "weekly",
            "bi-weekly",
            "monthly",
            "quarterly",
            "yearly",
            "random",
          ],
          {
            message: messages.frequencyRequired,
          }
        ),
        randomEveryXDays: z
          .number()
          .min(1, {
            message: messages.randomDaysRequired,
          })
          .max(365, {
            message: messages.randomDaysMax,
          })
          .optional(),
        startDate: baseDateSchema(messages.startDateRequired),
        endDate: baseOptionalDateSchema(),
        lastGeneratedDate: baseOptionalDateSchema(),
      })
      .superRefine((data, ctx) => {
        if (data.frequency === "random" && !data.randomEveryXDays) {
          ctx.addIssue({
            path: ["randomEveryXDays"],
            message: messages.randomDaysRequired,
            code: "custom",
          })
        }

        if (data.endDate && data.endDate <= data.startDate) {
          ctx.addIssue({
            path: ["endDate"],
            message: messages.endDateAfterStartDate,
            code: "custom",
          })
        }
      })

  const createAdminUserSchema = () =>
    z.object({
      email: z.email({ message: messages.emailInvalid }),
      password: basePasswordSchema(),
      name: z
        .string()
        .min(1, { message: messages.nameRequired })
        .max(100, { message: messages.nameMaxLength }),
      username: baseUsernameSchema(),
      role: z.enum(ASSIGNABLE_ROLES, {
        message: messages.roleRequired,
      }),
    })

  const createAdminPasswordSchema = createTwoFactorPasswordSchema

  const createAdminBanSchema = () =>
    z.object({
      banReason: z
        .string()
        .max(200, { message: messages.banReasonMaxLength })
        .optional()
        .or(z.literal("")),
      duration: z.string().min(1, { message: messages.durationRequired }),
    })

  return {
    createSignInSchema,
    createPasswordSchema,
    createTwoFactorPasswordSchema,
    createTwoFactorCodeSchema,
    createNameSchema,
    createUsernameSchema,
    createTransactionSchema,
    createCategorySchema,
    createBudgetSchema,
    createGoalSchema,
    createRecurringTransactionSchema,
    createAdminUserSchema,
    createAdminPasswordSchema,
    createAdminBanSchema,
  }
}
