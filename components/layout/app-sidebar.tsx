"use client"

import { useExtracted } from "next-intl"

import { siteConfig } from "@/app/pfa.config"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { MainNav } from "@/components/layout/main-nav"
import { SecondaryNav } from "@/components/layout/secondary-nav"
import { Logo } from "@/components/logo"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useExtracted()

  return (
    <Sidebar
      className="pr-0 group-data-[state=collapsed]:pr-2.25"
      variant="floating"
      collapsible="icon"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenuButton size="lg" tooltip={t("Personal Finance App")}>
          <Logo loading="eager" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{siteConfig.name}</span>
          </div>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <MainNav />
      </SidebarContent>
      <SidebarFooter className="p-0">
        <SecondaryNav />
      </SidebarFooter>
    </Sidebar>
  )
}
