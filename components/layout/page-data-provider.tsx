import { GhostIcon } from "lucide-react"
import { getExtracted } from "next-intl/server"

import { getBudgets } from "@/actions/budget.actions"
import { getCustomCategories } from "@/actions/category.actions"
import { getGoals } from "@/actions/goal.actions"
import { getRecurringTransactions } from "@/actions/recurring.actions"
import { getTransactions } from "@/actions/transaction.actions"
import { EmptyState } from "@/components/empty-state"
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

  const Icon = <GhostIcon />
  const fallbackDescription = t("Please try again later.")

  if (transactions && !transactionsResult?.transactions) {
    return (
      <EmptyState
        className="mt-3"
        icon={Icon}
        title={t("Cannot fetch transactions data")}
        description={transactionsResult?.error ?? fallbackDescription}
      />
    )
  }

  if (categories && !categoriesResult?.customCategories) {
    return (
      <EmptyState
        className="mt-3"
        icon={Icon}
        title={t("Cannot fetch categories data")}
        description={categoriesResult?.error ?? fallbackDescription}
      />
    )
  }

  if (budgets && !budgetsResult?.budgets) {
    return (
      <EmptyState
        className="mt-3"
        icon={Icon}
        title={t("Cannot fetch budgets data")}
        description={budgetsResult?.error ?? fallbackDescription}
      />
    )
  }

  if (goals && !goalsResult?.goals) {
    return (
      <EmptyState
        className="mt-3"
        icon={Icon}
        title={t("Cannot fetch goals data")}
        description={goalsResult?.error ?? fallbackDescription}
      />
    )
  }

  if (recurring && !recurringResult?.recurringTransactions) {
    return (
      <EmptyState
        className="mt-3"
        icon={Icon}
        title={t("Cannot fetch recurring transactions data")}
        description={recurringResult?.error ?? fallbackDescription}
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
