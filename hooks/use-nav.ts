"use client"

import type { Route } from "next"
import {
  ChartColumnIncreasingIcon,
  HomeIcon,
  PiggyBankIcon,
  RepeatIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TagIcon,
  TargetIcon,
  WalletIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { useUser } from "@/contexts/user-context"
import { isAdminRole } from "@/lib/role"

type NavType = {
  url: Route
  icon: LucideIcon
  label: string
}
export function useNav() {
  const t = useExtracted()
  const { user } = useUser()
  const isAdmin = isAdminRole(user.role)

  const mainNav: NavType[] = [
    {
      url: "/home",
      icon: HomeIcon,
      label: t("Home"),
    },
    {
      url: "/statistics",
      icon: ChartColumnIncreasingIcon,
      label: t("Statistics"),
    },
    {
      url: "/transactions",
      icon: WalletIcon,
      label: t("Transactions"),
    },
    {
      url: "/categories",
      icon: TagIcon,
      label: t("Categories"),
    },
    {
      url: "/budgets",
      icon: PiggyBankIcon,
      label: t("Budgets"),
    },
    {
      url: "/goals",
      icon: TargetIcon,
      label: t("Goals"),
    },
    {
      url: "/recurring",
      icon: RepeatIcon,
      label: t("Recurring"),
    },
  ]

  const secondaryNav: NavType[] = [
    {
      url: "/settings",
      icon: SettingsIcon,
      label: t("Settings"),
    },
  ]

  if (isAdmin) {
    secondaryNav.push({
      url: "/admin",
      icon: ShieldCheckIcon,
      label: t("Admin"),
    })
  }

  return { mainNav, secondaryNav }
}
