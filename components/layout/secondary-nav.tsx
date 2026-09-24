"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { useNav } from "@/hooks/use-nav"

export function SecondaryNav() {
  const pathname = usePathname()
  const { secondaryNav } = useNav()

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {secondaryNav.map(({ url, icon: Icon, label }) => (
            <SidebarMenuItem key={url}>
              <SidebarMenuButton
                isActive={pathname === url}
                tooltip={label}
                asChild
              >
                <Link href={url}>
                  <Icon />
                  {label}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SignOutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
