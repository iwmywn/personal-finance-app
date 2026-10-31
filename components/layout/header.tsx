"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SlashIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { StopImpersonation } from "@/components/admin/stop-impersonation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useNav } from "@/hooks/use-nav"

export function Header() {
  const pathname = usePathname()
  const t = useExtracted()
  const { mainNav, secondaryNav } = useNav()

  const allNavItems = [...mainNav, ...secondaryNav]
  const foundItem = allNavItems.find((item) => item.url === pathname)

  return (
    <header className="sticky top-0 z-50 flex shrink-0 items-center justify-between border-b bg-background/90 py-2.5 backdrop-blur-xs backdrop-saturate-150">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="border transition-colors hover:bg-primary hover:text-background" />
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
      <div className="flex items-center gap-3">
        <StopImpersonation />
      </div>
    </header>
  )
}
