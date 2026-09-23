"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "cn"
import { CalendarIcon } from "lucide-react"
import { useExtracted } from "next-intl"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { createGoal, updateGoal } from "@/actions/goal.actions"
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
import { CategoryFormSelect } from "@/components/category-form-select"
import { CurrencyInput } from "@/components/currency-input"
import { useUser } from "@/contexts/user-context"
import { useFormatDate } from "@/hooks/use-format-date"
import { useSchemas } from "@/hooks/use-schemas"
import { CURRENCIES, CURRENCY_CONFIG } from "@/lib/currency"
import type { Currency } from "@/lib/currency"
import { parseToLocalDate } from "@/lib/date"
import type { Goal } from "@/lib/definitions"
import type { GoalFormValues } from "@/schemas/types"

interface GoalFormProps {
  goal?: Goal
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function GoalForm({ goal, isOpen, setIsOpen }: GoalFormProps) {
  const [startCalendarOpen, setStartCalendarOpen] = useState<boolean>(false)
  const [endCalendarOpen, setEndCalendarOpen] = useState<boolean>(false)
  const t = useExtracted()
  const { user } = useUser()
  const formatDate = useFormatDate()
  const router = useRouter()
  const { createGoalSchema } = useSchemas()
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(createGoalSchema()),
    defaultValues: {
      categoryKey: goal?.categoryKey || "",
      name: goal?.name || "",
      currency: goal?.currency ?? (user.currency as Currency),
      targetAmount: goal?.targetAmount ?? "",
      startDate: parseToLocalDate(goal?.startDate),
      endDate: parseToLocalDate(goal?.endDate),
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

  const currency = useWatch({
    control: form.control,
    name: "currency",
  })

  async function onSubmit(values: GoalFormValues) {
    if (goal) {
      try {
        const { error, success } = await updateGoal(goal._id, values)

        if (success === undefined) {
          toast.error(error)
        } else {
          setIsOpen(false)
          toast.success(success)
          router.refresh()
        }
      } catch {
        toast.error(t("Failed to update goal! Please try again later."))
      }
    } else {
      try {
        const { error, success } = await createGoal(values)

        if (success === undefined) {
          toast.error(error)
        } else {
          setIsOpen(false)
          toast.success(success)
          router.refresh()
          form.reset()
        }
      } catch {
        toast.error(t("Failed to create goal! Please try again later."))
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? t("Edit Goal") : t("Add Goal")}</DialogTitle>
          <DialogDescription>
            {goal
              ? t("Update goal information.")
              : t("Create a new financial goal.")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <CategoryFormSelect control={form.control} type="inflow" />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-goal-name">
                    {t("Goal Name")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="form-goal-name"
                      placeholder={t("e.g. Save for vacation")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-currency">{t("Currency")}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue("targetAmount", "")
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
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-target-amount">
                    {t("Target Amount")}
                  </FormLabel>
                  <FormControl>
                    <CurrencyInput
                      id="form-target-amount"
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
                        disabled={(date) => endDate && date > endDate}
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
                  <FormLabel htmlFor="form-end-date">{t("End Date")}</FormLabel>
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
                        >
                          {endDate ? (
                            formatDate(endDate)
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
                        selected={endDate}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          field.onChange(date)
                          setEndCalendarOpen(false)
                        }}
                        disabled={(date) => startDate && date <= startDate}
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
                {goal ? t("Update") : t("Add")}
              </FormButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
