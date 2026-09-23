"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "cn"
import { CalendarIcon } from "lucide-react"
import { useExtracted } from "next-intl"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { createRecurringTransaction } from "@/actions/recurring.actions"
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
import { Input } from "@/components/ui/input"
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
import type { RecurringTransaction } from "@/lib/definitions"
import type { RecurringTransactionFormValues } from "@/schemas/types"

interface RecurringDialogProps {
  recurring?: RecurringTransaction
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function RecurringTransactionDialog({
  recurring,
  isOpen,
  setIsOpen,
}: RecurringDialogProps) {
  const isDuplicate = Boolean(recurring)
  const [startCalendarOpen, setStartCalendarOpen] = useState<boolean>(false)
  const [endCalendarOpen, setEndCalendarOpen] = useState<boolean>(false)
  const [type, setType] = useState<CategoryType>(recurring?.type || "inflow")
  const t = useExtracted()
  const { user } = useUser()
  const formatDate = useFormatDate()
  const router = useRouter()
  const { createRecurringTransactionSchema } = useSchemas()
  const form = useForm<RecurringTransactionFormValues>({
    resolver: zodResolver(createRecurringTransactionSchema()),
    defaultValues: {
      type: recurring?.type || "inflow",
      categoryKey: recurring?.categoryKey || "",
      currency: recurring?.currency ?? (user.currency as Currency),
      amount: recurring?.amount ?? "",
      description: recurring?.description || "",
      frequency: recurring?.frequency || "monthly",
      randomEveryXDays: recurring?.randomEveryXDays || undefined,
      startDate: undefined,
      endDate: undefined,
      lastGeneratedDate: undefined,
    },
  })

  const startDate = useWatch({
    control: form.control,
    name: "startDate",
  })

  const endDate = useWatch({
    control: form.control,
    name: "endDate",
  })

  const frequency = useWatch({
    control: form.control,
    name: "frequency",
  })

  async function onSubmit(values: RecurringTransactionFormValues) {
    try {
      const { error, success } = await createRecurringTransaction(values)

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
      toast.error(
        t("Failed to create recurring transaction! Please try again later.")
      )
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
            {isDuplicate
              ? t("Duplicate Recurring Transaction")
              : t("Add Recurring Transaction")}
          </DialogTitle>
          <DialogDescription>
            {isDuplicate
              ? t(
                  "Create a new recurring transaction based on the selected one."
                )
              : t("Create a recurring transaction.")}
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
                      currency={form.getValues("currency")}
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
                        placeholder={t("Enter a description...")}
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
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-frequency">
                    {t("Frequency")}
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      if (value !== "random") {
                        form.setValue("randomEveryXDays", undefined)
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger id="form-frequency" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">{t("Daily")}</SelectItem>
                      <SelectItem value="weekly">{t("Weekly")}</SelectItem>
                      <SelectItem value="bi-weekly">
                        {t("Bi-Weekly")}
                      </SelectItem>
                      <SelectItem value="monthly">{t("Monthly")}</SelectItem>
                      <SelectItem value="quarterly">
                        {t("Quarterly")}
                      </SelectItem>
                      <SelectItem value="yearly">{t("Yearly")}</SelectItem>
                      <SelectItem value="random">{t("Random")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {frequency === "random" && (
              <FormField
                control={form.control}
                name="randomEveryXDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="form-every-x-days">
                      {t("Every X Days")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="form-every-x-days"
                        inputMode="numeric"
                        placeholder={t("e.g. 15")}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, "")
                          const numericValue = rawValue
                            ? Number.parseInt(rawValue, 10)
                            : undefined
                          field.onChange(numericValue)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-start-date">
                    {t("Start Date")}
                  </FormLabel>
                  <Popover
                    open={startCalendarOpen}
                    onOpenChange={setStartCalendarOpen}
                  >
                    <FormControl>
                      <PopoverTrigger id="form-start-date" asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-between font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          {startDate ? (
                            formatDate(startDate)
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
                        selected={startDate}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          field.onChange(date)
                          setStartCalendarOpen(false)
                        }}
                        disabled={(date) => Boolean(endDate && date > endDate)}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-end-date">
                    {t("End Date")} ({t("Optional")})
                  </FormLabel>
                  <Popover
                    open={endCalendarOpen}
                    onOpenChange={setEndCalendarOpen}
                  >
                    <FormControl>
                      <PopoverTrigger id="form-end-date" asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-between font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                          onClick={() => {
                            if (!endDate) {
                              field.onChange(undefined)
                            }
                          }}
                        >
                          {endDate ? (
                            formatDate(endDate)
                          ) : (
                            <span>{t("No End Date")}</span>
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
                        selected={endDate}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          field.onChange(date)
                          setEndCalendarOpen(false)
                        }}
                        disabled={(date) =>
                          Boolean(startDate && date <= startDate)
                        }
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
                {isDuplicate ? t("Duplicate") : t("Add")}
              </FormButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
