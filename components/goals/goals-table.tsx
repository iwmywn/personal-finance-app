"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { MoreVerticalIcon, TargetIcon } from "lucide-react"
import { useExtracted, useTimeZone } from "next-intl"

import { EmptyState } from "@/components/empty-state"
import { DeleteGoal } from "@/components/goals/delete-goal"
import { GoalForm } from "@/components/goals/goal-form"
import { UnconvertedTransactionsAlert } from "@/components/transactions/unconverted-transactions-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useGoals } from "@/contexts/goals-context"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategory } from "@/hooks/use-category"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { useFormatDate } from "@/hooks/use-format-date"
import { serializeUTCDate } from "@/lib/date"
import type { Goal } from "@/lib/definitions"
import { calculateGoalsStats } from "@/lib/statistics"

interface GoalsTableProps {
  filteredGoals: Goal[]
}

export function GoalsTable({ filteredGoals }: GoalsTableProps) {
  const { goals } = useGoals()
  const { transactions } = useTransactions()
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false)
  const t = useExtracted()
  const { getCategoryLabel, getCategoryDescription } = useCategory()
  const formatDate = useFormatDate()
  const formatCurrency = useFormatCurrency()
  const timeZone = useTimeZone()

  const goalsWithStats = calculateGoalsStats(
    filteredGoals,
    transactions,
    timeZone
  )

  const inflowTransactions = useMemo(
    () => transactions.filter((t) => t.type === "inflow"),
    [transactions]
  )

  return (
    <>
      <Card>
        <CardContent>
          {filteredGoals.length === 0 ? (
            <EmptyState
              icon={<TargetIcon />}
              title={t("No goals found")}
              description={
                goals.length === 0
                  ? t("You haven't created any goals yet.")
                  : t("No goals found matching your filters.")
              }
            />
          ) : (
            <div className="flex h-full flex-col gap-3">
              <UnconvertedTransactionsAlert transactions={inflowTransactions} />
              <Table>
                <TableHeader>
                  <TableRow className="[&>th]:text-center">
                    <TableHead>{t("Start Date")}</TableHead>
                    <TableHead>{t("End Date")}</TableHead>
                    <TableHead>{t("Goal Name")}</TableHead>
                    <TableHead>{t("Category")}</TableHead>
                    <TableHead>{t("Target Amount")}</TableHead>
                    <TableHead>{t("Accumulated")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead>{t("Progress")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goalsWithStats.map((goal) => (
                    <TableRow key={goal._id} className="[&>td]:text-center">
                      <TableCell>{formatDate(goal.startDate)}</TableCell>
                      <TableCell>{formatDate(goal.endDate)}</TableCell>
                      <TableCell>{goal.name}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline">
                              {getCategoryLabel(goal.categoryKey)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {getCategoryDescription(goal.categoryKey)}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(goal.targetAmount, goal.currency)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(goal.accumulated, goal.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            goal.status === "expired"
                              ? "badge-red"
                              : goal.status === "active"
                                ? "badge-green"
                                : "badge-yellow"
                          }
                        >
                          {goal.status === "expired"
                            ? t("Expired")
                            : goal.status === "active"
                              ? t("Active")
                              : t("Upcoming")}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-32">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Progress
                              value={Math.min(100, goal.percentage)}
                              className={`flex-1 ${goal.progressColorClass}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            {goal.percentage.toFixed(1)}%
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVerticalIcon />
                              <span className="sr-only">{t("Open menu")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/transactions?from=${serializeUTCDate(goal.startDate)}&to=${serializeUTCDate(goal.endDate)}&type=inflow&category=${goal.categoryKey}`}
                              >
                                {t("View")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedGoal(goal)
                                setIsEditOpen(true)
                              }}
                            >
                              {t("Edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setSelectedGoal(goal)
                                setIsDeleteOpen(true)
                              }}
                            >
                              {t("Delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGoal && (
        <>
          <GoalForm
            key={selectedGoal._id + "GoalForm"}
            goal={selectedGoal}
            isOpen={isEditOpen}
            setIsOpen={setIsEditOpen}
          />
          <DeleteGoal
            key={selectedGoal._id + "DeleteGoal"}
            goalId={selectedGoal._id}
            isOpen={isDeleteOpen}
            setIsOpen={setIsDeleteOpen}
          />
        </>
      )}
    </>
  )
}
