import type * as z from "zod"

import type { useSchemas } from "@/hooks/use-schemas"

export type SignInFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createSignInSchema"]>
>
export type PasswordFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createPasswordSchema"]>
>
export type TwoFactorPasswordFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createTwoFactorPasswordSchema"]>
>
export type TwoFactorCodeFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createTwoFactorCodeSchema"]>
>
export type NameFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createNameSchema"]>
>
export type UsernameFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createUsernameSchema"]>
>
export type TransactionFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createTransactionSchema"]>
>
export type CategoryFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createCategorySchema"]>
>
export type BudgetFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createBudgetSchema"]>
>
export type GoalFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createGoalSchema"]>
>
export type RecurringTransactionFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createRecurringTransactionSchema"]>
>
export type AdminUserFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createAdminUserSchema"]>
>
export type AdminPasswordFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createAdminPasswordSchema"]>
>
export type AdminBanFormValues = z.infer<
  ReturnType<ReturnType<typeof useSchemas>["createAdminBanSchema"]>
>
