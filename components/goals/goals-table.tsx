"use client"

import { useState } from "react"
import Link from "next/link"
import { MoreVerticalIcon, TargetIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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
import { DeleteGoal } from "@/components/goals/delete-goal"
import { GoalForm } from "@/components/goals/goal-form"
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

  const goalsWithStats = calculateGoalsStats(filteredGoals, transactions)

  return (
    <>
      <Card className="flex-1 overflow-auto">
        <CardContent className="h-full">
          {filteredGoals.length === 0 ? (
            <Empty className="h-full border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TargetIcon />
                </EmptyMedia>
                <EmptyTitle>{t("No goals found")}</EmptyTitle>
                <EmptyDescription>
                  {goals.length === 0
                    ? t("You haven't created any goals yet.")
                    : t("No goals found matching your filters.")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="table-wrapper">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-1">
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
                      <TableCell className="font-medium">{goal.name}</TableCell>
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
                            <Button
                              className="dark:hover:bg-input/50"
                              variant="ghost"
                              size="icon"
                            >
                              <MoreVerticalIcon />
                              <span className="sr-only">{t("Open menu")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/transactions?from=${serializeUTCDate(goal.startDate)}&to=${serializeUTCDate(goal.endDate)}&category=${goal.categoryKey}`}
                                className="cursor-pointer"
                              >
                                {t("View")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedGoal(goal)
                                setIsEditOpen(true)
                              }}
                            >
                              {t("Edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
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
