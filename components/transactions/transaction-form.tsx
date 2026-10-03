"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "cn"
import { CalendarIcon } from "lucide-react"
import { useExtracted } from "next-intl"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import {
  createTransaction,
  updateTransaction,
} from "@/actions/transaction.actions"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormButton,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategoryFormSelect } from "@/components/category-form-select"
import { CurrencyInput } from "@/components/currency-input"
import { useUser } from "@/contexts/user-context"
import { useFormatDate } from "@/hooks/use-format-date"
import { useSchemas } from "@/hooks/use-schemas"
import type { CategoryType } from "@/lib/category"
import { CURRENCIES, CURRENCY_CONFIG } from "@/lib/currency"
import type { Currency } from "@/lib/currency"
import { parseToLocalDate } from "@/lib/date"
import type { Transaction } from "@/lib/definitions"
import type { TransactionFormValues } from "@/schemas/types"

interface TransactionFormProps {
  transaction?: Transaction
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function TransactionForm({
  transaction,
  isOpen,
  setIsOpen,
}: TransactionFormProps) {
  const [type, setType] = useState<CategoryType>(transaction?.type || "inflow")
  const [calendarOpen, setCalendarOpen] = useState<boolean>(false)
  const t = useExtracted()
  const { user } = useUser()
  const formatDate = useFormatDate()
  const router = useRouter()
  const { createTransactionSchema } = useSchemas()
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(createTransactionSchema()),
    defaultValues: {
      type: transaction?.type || "inflow",
      currency:
        transaction?.originalCurrency ??
        transaction?.currency ??
        (user.currency as Currency),
      amount: transaction?.originalAmount ?? transaction?.amount ?? "",
      description: transaction?.description || "",
      categoryKey: transaction?.categoryKey || "",
      date: parseToLocalDate(transaction?.date),
    },
  })

  const selectedDate = useWatch({
    control: form.control,
    name: "date",
  })

  const currency = useWatch({
    control: form.control,
    name: "currency",
  })

  async function onSubmit(values: TransactionFormValues) {
    if (transaction) {
      try {
        const { error, success } = await updateTransaction(
          transaction._id,
          values
        )

        if (success === undefined) {
          toast.error(error)
        } else {
          setIsOpen(false)
          toast.success(success)
          router.refresh()
        }
      } catch {
        toast.error(t("Failed to update transaction! Please try again later."))
      }
    } else {
      try {
        const { error, success } = await createTransaction(values)

        if (success === undefined) {
          toast.error(error)
        } else {
          setIsOpen(false)
          toast.success(success)
          router.refresh()
          form.reset({
            ...form.formState.defaultValues,
            type,
          })
        }
      } catch {
        toast.error(t("Failed to create transaction! Please try again later."))
      }
    }
  }

  const handleTypeChange = (type: CategoryType) => {
    setType(type)
    form.setValue("type", type)
    form.resetField("categoryKey", { defaultValue: "" })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {transaction ? t("Edit Transaction") : t("Add Transaction")}
          </DialogTitle>
          <DialogDescription>
            {transaction
              ? t("Update transaction information.")
              : t(
                  "Add your inflow or outflow to track your personal finances."
                )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs
              value={type}
              onValueChange={(value) => handleTypeChange(value as CategoryType)}
            >
              <TabsList className="w-full">
                <TabsTrigger value="inflow">{t("Inflow")}</TabsTrigger>
                <TabsTrigger value="outflow">{t("Outflow")}</TabsTrigger>
              </TabsList>

              <TabsContent value="inflow" className="space-y-4">
                <CategoryFormSelect
                  control={form.control}
                  type="inflow"
                  showDescription
                />
              </TabsContent>

              <TabsContent value="outflow" className="space-y-4">
                <CategoryFormSelect
                  control={form.control}
                  type="outflow"
                  showDescription
                />
              </TabsContent>
            </Tabs>

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-currency">{t("Currency")}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue("amount", "")
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger id="form-currency" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {CURRENCY_CONFIG[currency].displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-amount">{t("Amount")}</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      id="form-amount"
                      value={field.value}
                      onValueChange={field.onChange}
                      currency={currency}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-description">
                    {t("Description")}
                  </FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupTextarea
                        id="form-description"
                        placeholder={t(
                          "Enter a description for the transaction..."
                        )}
                        maxLength={200}
                        {...field}
                      />
                      <InputGroupAddon align="block-end">
                        <InputGroupText className="text-muted-foreground text-xs">
                          {field.value?.length || 0}/200
                        </InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-date">{t("Date")}</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <FormControl>
                      <PopoverTrigger id="form-date" asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-between font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          {selectedDate ? (
                            formatDate(selectedDate)
                          ) : (
                            <span>{t("Select Date")}</span>
                          )}
                          <CalendarIcon />
                        </Button>
                      </PopoverTrigger>
                    </FormControl>
                    <PopoverContent
                      className="w-auto overflow-hidden p-0"
                      align="start"
                    >
                      <Calendar
                        autoFocus
                        mode="single"
                        selected={selectedDate}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          field.onChange(date)
                          setCalendarOpen(false)
                        }}
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t("Cancel")}</Button>
              </DialogClose>
              <FormButton isSubmitting={form.formState.isSubmitting}>
                {transaction ? t("Update") : t("Add")}
              </FormButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
