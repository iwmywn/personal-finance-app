import { getExtracted } from "next-intl/server"

import { getBudgets } from "@/actions/budget.actions"
import { getCustomCategories } from "@/actions/category.actions"
import { getGoals } from "@/actions/goal.actions"
import { getRecurringTransactions } from "@/actions/recurring.actions"
import { getTransactions } from "@/actions/transaction.actions"
import { ErrorEmptyState } from "@/components/layout/error-empty-state"
import { BudgetsContext } from "@/contexts/budgets-context"
import { CategoriesContext } from "@/contexts/categories-context"
import { GoalsContext } from "@/contexts/goals-context"
import { RecurringContext } from "@/contexts/recurring-context"
import { TransactionsContext } from "@/contexts/transactions-context"

type PageDataProviderProps = {
  children: React.ReactNode
  transactions?: boolean
  categories?: boolean
  budgets?: boolean
  goals?: boolean
  recurring?: boolean
}

export async function PageDataProvider({
  children,
  transactions,
  categories,
  budgets,
  goals,
  recurring,
}: PageDataProviderProps) {
  const t = await getExtracted()

  const [
    transactionsResult,
    categoriesResult,
    budgetsResult,
    goalsResult,
    recurringResult,
  ] = await Promise.all([
    transactions ? getTransactions() : Promise.resolve(null),
    categories ? getCustomCategories() : Promise.resolve(null),
    budgets ? getBudgets() : Promise.resolve(null),
    goals ? getGoals() : Promise.resolve(null),
    recurring ? getRecurringTransactions() : Promise.resolve(null),
  ])

  if (transactions && !transactionsResult?.transactions) {
    return (
      <ErrorEmptyState
        title={t("CANNOT FETCH TRANSACTIONS DATA")}
        description={transactionsResult?.error}
      />
    )
  }

  if (categories && !categoriesResult?.customCategories) {
    return (
      <ErrorEmptyState
        title={t("CANNOT FETCH CATEGORIES DATA")}
        description={categoriesResult?.error}
      />
    )
  }

  if (budgets && !budgetsResult?.budgets) {
    return (
      <ErrorEmptyState
        title={t("CANNOT FETCH BUDGETS DATA")}
        description={budgetsResult?.error}
      />
    )
  }

  if (goals && !goalsResult?.goals) {
    return (
      <ErrorEmptyState
        title={t("CANNOT FETCH GOALS DATA")}
        description={goalsResult?.error}
      />
    )
  }

  if (recurring && !recurringResult?.recurringTransactions) {
    return (
      <ErrorEmptyState
        title={t("CANNOT FETCH RECURRING TRANSACTIONS DATA")}
        description={recurringResult?.error}
      />
    )
  }

  let content = children

  if (transactions && transactionsResult?.transactions) {
    content = (
      <TransactionsContext
        value={{ transactions: transactionsResult.transactions }}
      >
        {content}
      </TransactionsContext>
    )
  }

  if (categories && categoriesResult?.customCategories) {
    content = (
      <CategoriesContext
        value={{ customCategories: categoriesResult.customCategories }}
      >
        {content}
      </CategoriesContext>
    )
  }

  if (budgets && budgetsResult?.budgets) {
    content = (
      <BudgetsContext value={{ budgets: budgetsResult.budgets }}>
        {content}
      </BudgetsContext>
    )
  }

  if (goals && goalsResult?.goals) {
    content = (
      <GoalsContext value={{ goals: goalsResult.goals }}>
        {content}
      </GoalsContext>
    )
  }

  if (recurring && recurringResult?.recurringTransactions) {
    content = (
      <RecurringContext
        value={{
          recurringTransactions: recurringResult.recurringTransactions,
        }}
      >
        {content}
      </RecurringContext>
    )
  }

  return <>{content}</>
}
