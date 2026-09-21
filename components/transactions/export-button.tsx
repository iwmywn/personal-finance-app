"use client"

import { useTransition } from "react"
import { Download } from "lucide-react"
import { useExtracted } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCategory } from "@/hooks/use-category"
import { useFormatDate } from "@/hooks/use-format-date"
import type { Transaction } from "@/lib/definitions"

interface ExportButtonProps {
  filteredTransactions: Transaction[]
}

export function sanitizeCSVField(value: string): string {
  let sanitized = value
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = `'${sanitized}`
  }
  return `"${sanitized.replace(/"/g, '""')}"`
}

export function ExportButton({ filteredTransactions }: ExportButtonProps) {
  const [isPending, startTransition] = useTransition()
  const t = useExtracted()
  const formatDate = useFormatDate()
  const { getCategoryLabel } = useCategory()

  function formatTransactionsToCSV(
    filteredTransactions: Transaction[]
  ): string {
    const headers = [
      sanitizeCSVField(t("Date")),
      sanitizeCSVField(t("Type")),
      sanitizeCSVField(t("Category")),
      sanitizeCSVField(t("Amount")),
      sanitizeCSVField(t("Currency")),
      sanitizeCSVField(t("Description")),
    ]
    const rows = filteredTransactions.map((ft) => {
      const date = sanitizeCSVField(formatDate(ft.date))
      const type = sanitizeCSVField(
        ft.type === "inflow" ? t("Inflow") : t("Outflow")
      )
      const category = sanitizeCSVField(getCategoryLabel(ft.categoryKey))
      const amount = sanitizeCSVField(ft.amount.toString())
      const currency = sanitizeCSVField(ft.currency)
      const description = sanitizeCSVField(ft.description)
      return [date, type, category, amount, currency, description]
    })

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
  }

  function handleExport() {
    if (filteredTransactions.length === 0) {
      toast.error(t("No transactions found"))
      return
    }

    startTransition(() => {
      try {
        const csvContent = formatTransactionsToCSV(filteredTransactions)
        let dateStr: string = ""

        if (filteredTransactions.length === 1) {
          dateStr = formatDate(filteredTransactions[0].date)
        } else if (filteredTransactions.length > 1) {
          let minTime = Infinity
          let maxTime = -Infinity
          for (const t of filteredTransactions) {
            const time = new Date(t.date).getTime()
            if (time < minTime) minTime = time
            if (time > maxTime) maxTime = time
          }
          const minDate = new Date(minTime)
          const maxDate = new Date(maxTime)
          const fromDateStr = formatDate(minDate)
          const toDateStr = formatDate(maxDate)
          dateStr = `${t("From")}_${fromDateStr}_${t("To")}_${toDateStr}`
        }

        const filename = `${t("transactions")}_${dateStr}.csv`
          .replace(/[/\\?%*:|"<> ]+/g, "_")
          .toLowerCase()

        // Add UTF-8 BOM for proper encoding in Excel
        const BOM = "\uFEFF"
        const blob = new Blob([BOM + csvContent], {
          type: "text/csv;charset=utf-8;",
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success(t("Export Transactions (CSV)") + " " + filename)
      } catch (error) {
        console.error("Error exporting CSV:", error)
        toast.error(t("Failed to export data! Please try again later."))
      }
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="dark:hover:bg-input/50"
          onClick={handleExport}
          disabled={isPending}
        >
          {isPending ? <Spinner /> : <Download />}
          <span className="sr-only">
            {t("Export transactions with current filters applied.")}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {t("Export transactions with current filters applied.")}
      </TooltipContent>
    </Tooltip>
  )
}
