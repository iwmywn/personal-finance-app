"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useExtracted } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  createCustomCategory,
  updateCustomCategory,
} from "@/actions/category.actions"
import { Button } from "@/components/ui/button"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSchemas } from "@/hooks/use-schemas"
import type { CategoryType } from "@/lib/category"
import type { Category } from "@/lib/definitions"
import type { CategoryFormValues } from "@/schemas/types"

interface CategoryFormProps {
  category?: Category
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function CategoryForm({
  category,
  isOpen,
  setIsOpen,
}: CategoryFormProps) {
  const t = useExtracted()
  const router = useRouter()
  const [type, setType] = useState<CategoryType>(category?.type || "inflow")
  const { createCategorySchema } = useSchemas()
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(createCategorySchema()),
    defaultValues: {
      type: category?.type || "inflow",
      label: category?.label || "",
      description: category?.description || "",
    },
  })

  async function onSubmit(values: CategoryFormValues) {
    if (category) {
      try {
        const { error, success } = await updateCustomCategory(
          category._id,
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
        toast.error(t("Failed to update category! Please try again later."))
      }
    } else {
      try {
        const { error, success } = await createCustomCategory(values)

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
        toast.error(t("Failed to create category! Please try again later."))
      }
    }
  }

  const handleTypeChange = (type: CategoryType) => {
    setType(type)
    form.setValue("type", type)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? t("Edit Category") : t("Add Category")}
          </DialogTitle>
          <DialogDescription>
            {category
              ? t("Update custom category information.")
              : t("Create a custom category for your transactions.")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs
              value={type}
              onValueChange={(value) => handleTypeChange(value as CategoryType)}
            >
              <TabsList className="w-full">
                <TabsTrigger value="inflow" disabled={Boolean(category)}>
                  {t("Inflow")}
                </TabsTrigger>
                <TabsTrigger value="outflow" disabled={Boolean(category)}>
                  {t("Outflow")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="form-category-name">
                    {t("Category Name")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="form-category-name"
                      placeholder={t("e.g. Salary, Groceries")}
                      {...field}
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

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t("Cancel")}</Button>
              </DialogClose>
              <FormButton isSubmitting={form.formState.isSubmitting}>
                {category ? t("Update") : t("Add")}
              </FormButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
