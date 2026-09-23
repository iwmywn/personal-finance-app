"use client"

import { useState } from "react"
import { MoreVerticalIcon, TagIcon } from "lucide-react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CategoryForm } from "@/components/categories/category-form"
import { DeleteCategory } from "@/components/categories/delete-category"
import { useCategories } from "@/contexts/categories-context"
import type { Category } from "@/lib/definitions"

interface CategoriesTableProps {
  filteredCategories: Category[]
}

export function CategoriesTable({ filteredCategories }: CategoriesTableProps) {
  const { customCategories } = useCategories()
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  )
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false)
  const t = useExtracted()

  return (
    <>
      <Card className="flex-1 overflow-auto">
        <CardContent className="h-full">
          {filteredCategories.length === 0 ? (
            <Empty className="h-full border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TagIcon />
                </EmptyMedia>
                <EmptyTitle>{t("No categories found")}</EmptyTitle>
                <EmptyDescription>
                  {customCategories.length === 0
                    ? t("You haven't created any custom categories yet.")
                    : t("No categories found matching your filters.")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="table-wrapper">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-1">
                  <TableRow className="[&>th]:text-center">
                    <TableHead>{t("Category Name")}</TableHead>
                    <TableHead>{t("Description")}</TableHead>
                    <TableHead>{t("Type")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category._id} className="[&>td]:text-center">
                      <TableCell className="min-w-38 wrap-anywhere whitespace-normal">
                        {category.label}
                      </TableCell>
                      <TableCell className="max-w-md min-w-52 wrap-anywhere whitespace-normal">
                        {category.description}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            category.type === "inflow"
                              ? "badge-green"
                              : "badge-red"
                          }
                        >
                          {category.type === "inflow"
                            ? t("Inflow")
                            : t("Outflow")}
                        </Badge>
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
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedCategory(category)
                                setIsEditOpen(true)
                              }}
                            >
                              {t("Edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              variant="destructive"
                              onClick={() => {
                                setSelectedCategory(category)
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

      {selectedCategory && (
        <>
          <CategoryForm
            key={selectedCategory._id + "CategoryForm"}
            category={selectedCategory}
            isOpen={isEditOpen}
            setIsOpen={setIsEditOpen}
          />
          <DeleteCategory
            key={selectedCategory._id + "DeleteCategory"}
            categoryId={selectedCategory._id}
            isOpen={isDeleteOpen}
            setIsOpen={setIsDeleteOpen}
          />
        </>
      )}
    </>
  )
}
