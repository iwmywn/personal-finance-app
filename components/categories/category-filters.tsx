"use client"

import { useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CategoriesTable } from "@/components/categories/categories-table"
import { useCategories } from "@/contexts/categories-context"
import type { CategoryType } from "@/lib/category"
import { filterCustomCategories } from "@/lib/filters"

export function CategoryFilters() {
  const { customCategories } = useCategories()
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterType, setFilterType] = useState<"all" | "inflow" | "outflow">(
    "all"
  )
  const t = useExtracted()

  const filteredCategories = filterCustomCategories(customCategories, {
    searchTerm,
    filterType,
  })

  const handleResetFilters = () => {
    setSearchTerm("")
    setFilterType("all")
  }

  const hasActiveFilters = searchTerm !== "" || filterType !== "all"

  return (
    <>
      <Card>
        <CardContent>
          <div
            className={`grid grid-cols-1 ${
              hasActiveFilters
                ? "md:grid-cols-[1fr_auto_auto]"
                : "md:grid-cols-[1fr_auto]"
            } gap-4`}
          >
            <InputGroup className={`${searchTerm !== "" && "border-primary"}`}>
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t("Search categories...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => setSearchTerm("")}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            <Select
              value={filterType}
              onValueChange={(value: "all" | CategoryType) =>
                setFilterType(value)
              }
            >
              <SelectTrigger
                className={`w-full md:w-fit ${filterType !== "all" && "border-primary"}`}
              >
                <SelectValue placeholder={t("Type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Types")}</SelectItem>
                <SelectSeparator />
                <SelectItem value="inflow">{t("Inflow")}</SelectItem>
                <SelectItem value="outflow">{t("Outflow")}</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="default"
                onClick={handleResetFilters}
                className="w-full md:w-fit"
              >
                {t("Reset")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <CategoriesTable filteredCategories={filteredCategories} />
    </>
  )
}
