"use client"

import { useState } from "react"
import { MoreVerticalIcon, WalletIcon } from "lucide-react"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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
import { DeleteTransaction } from "@/components/transactions/delete-transaction"
import { ExportButton } from "@/components/transactions/export-button"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { useTransactions } from "@/contexts/transactions-context"
import { useCategory } from "@/hooks/use-category"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { useFormatDate } from "@/hooks/use-format-date"
import type { Transaction } from "@/lib/definitions"

const ITEMS_PER_PAGE = 10

interface TransactionsTableProps {
  filteredTransactions: Transaction[]
}

export function TransactionsTable({
  filteredTransactions,
}: TransactionsTableProps) {
  const { transactions } = useTransactions()
  const t = useExtracted()
  const { getCategoryLabel, getCategoryDescription } = useCategory()
  const formatDate = useFormatDate()
  const formatCurrency = useFormatCurrency()
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false)
  const [isCurrentPage, setIsCurrentPage] = useState<number>(1)

  const totalPages =
    Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1
  const activePage = Math.min(Math.max(isCurrentPage, 1), totalPages)

  const startIndex = (activePage - 1) * ITEMS_PER_PAGE
  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  )

  return (
    <>
      <Card className="flex-1 overflow-auto">
        <CardContent className="h-full">
          {filteredTransactions.length === 0 ? (
            <Empty className="h-full border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <WalletIcon />
                </EmptyMedia>
                <EmptyTitle>{t("No transactions found")}</EmptyTitle>
                <EmptyDescription>
                  {transactions.length === 0
                    ? t("You haven't created any transactions yet.")
                    : t("No transactions found matching your filters.")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="table-wrapper min-h-0 flex-1">
                <Table>
                  <TableHeader className="bg-muted sticky top-0 z-1">
                    <TableRow className="[&>th]:text-center">
                      <TableHead>{t("Date")}</TableHead>
                      <TableHead>{t("Description")}</TableHead>
                      <TableHead>{t("Type")}</TableHead>
                      <TableHead>{t("Category")}</TableHead>
                      <TableHead>{t("Amount")}</TableHead>
                      <TableHead>
                        <ExportButton
                          filteredTransactions={filteredTransactions}
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((transaction) => (
                      <TableRow
                        key={transaction._id.toString()}
                        className="[&>td]:text-center"
                      >
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell className="max-w-md min-w-52 wrap-anywhere whitespace-normal">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              transaction.type === "inflow"
                                ? "badge-green"
                                : "badge-red"
                            }
                          >
                            {transaction.type === "inflow"
                              ? t("Inflow")
                              : t("Outflow")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline">
                                {getCategoryLabel(transaction.categoryKey)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {getCategoryDescription(transaction.categoryKey)}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="min-w-38 wrap-anywhere whitespace-normal">
                          <span
                            className={`font-semibold ${
                              transaction.type === "inflow"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {transaction.type === "inflow" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </span>
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
                                <span className="sr-only">
                                  {t("Open menu")}
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedTransaction(transaction)
                                  setIsEditOpen(true)
                                }}
                              >
                                {t("Edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedTransaction(transaction)
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

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (activePage > 1) {
                          setIsCurrentPage(activePage - 1)
                        }
                      }}
                      aria-disabled={activePage <= 1}
                      tabIndex={activePage <= 1 ? -1 : undefined}
                      className={
                        activePage <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (activePage < totalPages) {
                          setIsCurrentPage(activePage + 1)
                        }
                      }}
                      aria-disabled={activePage >= totalPages}
                      tabIndex={activePage >= totalPages ? -1 : undefined}
                      className={
                        activePage >= totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTransaction && (
        <>
          <TransactionForm
            key={selectedTransaction._id + "TransactionForm"}
            transaction={selectedTransaction}
            isOpen={isEditOpen}
            setIsOpen={setIsEditOpen}
          />
          <DeleteTransaction
            key={selectedTransaction._id + "DeleteTransaction"}
            transactionId={selectedTransaction._id}
            isOpen={isDeleteOpen}
            setIsOpen={setIsDeleteOpen}
          />
        </>
      )}
    </>
  )
}
