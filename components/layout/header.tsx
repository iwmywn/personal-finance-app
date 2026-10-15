"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SlashIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { StopImpersonation } from "@/components/admin/stop-impersonation"
import { clientEnv } from "@/env/client"
import { useNav } from "@/hooks/use-nav"

const Color =
  clientEnv.NEXT_PUBLIC_NODE_ENV === "development"
    ? dynamic(
        () => import("@/components/layout/color").then((mod) => mod.Color),
        { ssr: false }
      )
    : () => null

export function Header() {
  const pathname = usePathname()
  const t = useExtracted()
  const { mainNav, secondaryNav } = useNav()

  const allNavItems = [...mainNav, ...secondaryNav]
  const foundItem = allNavItems.find((item) => item.url === pathname)

  return (
    <header className="bg-primary-foreground sticky top-0 z-50 flex shrink-0 items-center justify-between py-2 backdrop-blur-xs backdrop-saturate-150">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {pathname === "/home" ? (
                <BreadcrumbPage>{t("Home")}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href="/home">{t("Home")}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {pathname !== "/home" && (
              <>
                <BreadcrumbSeparator>
                  <SlashIcon />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {foundItem ? foundItem.label : t("Not Found")}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2">
        <StopImpersonation />
        <Color />
      </div>
    </header>
  )
}
