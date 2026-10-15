import "server-only"

import { ObjectId } from "mongodb"

import { getCategoryType, isPredefinedCategoryKey } from "@/lib/category"
import type { CategoryType } from "@/lib/category"
import { getCategoriesCollection } from "@/lib/collections"

export async function isValidUserCategory(
  userId: string,
  categoryKey: string,
  expectedType?: CategoryType
): Promise<boolean> {
  if (isPredefinedCategoryKey(categoryKey)) {
    if (expectedType && getCategoryType(categoryKey) !== expectedType) {
      return false
    }
    return true
  }

  if (!ObjectId.isValid(categoryKey)) {
    return false
  }

  const categoriesCollection = await getCategoriesCollection()
  const customCategory = await categoriesCollection.findOne({
    _id: new ObjectId(categoryKey),
    userId: new ObjectId(userId),
  })

  if (!customCategory) {
    return false
  }

  if (expectedType && customCategory.type !== expectedType) {
    return false
  }

  return true
}
