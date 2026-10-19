"use client"

import { useExtracted } from "next-intl"
import type { Control, FieldValues, Path } from "react-hook-form"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormLink,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategory } from "@/hooks/use-category"
import type { CategoryType } from "@/lib/category"

interface CategoryFormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
> {
  control: Control<TFieldValues>
  type: CategoryType
  showDescription?: boolean
}

export function CategoryFormSelect<
  TFieldValues extends FieldValues = FieldValues,
>({
  control,
  type,
  showDescription = false,
}: CategoryFormSelectProps<TFieldValues>) {
  const t = useExtracted()
  const { getCategoryLabel, getCategoriesByType } = useCategory()

  return (
    <FormField
      control={control}
      name={"categoryKey" as Path<TFieldValues>}
      render={({ field }) => (
        <FormItem>
          <FormLabel htmlFor="form-category">{t("Category")}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger id="form-category" className="w-full">
                <SelectValue placeholder={t("Select Category")}>
                  {field.value ? getCategoryLabel(field.value) : null}
                </SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent className="w-(--radix-select-trigger-width)">
              {getCategoriesByType(type).map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  <div className="flex flex-col">
                    <span className="font-medium">{c.label}</span>
                    <span className="text-secondary wrap-anywhere">
                      {c.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showDescription && (
            <FormDescription>
              {t("Cannot find a suitable category?")}{" "}
              <FormLink href="/categories">
                {t("Create Custom Category")}
              </FormLink>
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
