import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { NuqsAdapter } from "nuqs/adapters/next/app"

import { getSession } from "@/actions/session.actions"
import { siteConfig } from "@/app/pfa.config"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { UserContext } from "@/contexts/user-context"
import { signInRoute } from "@/routes"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [cookieStore, sessionResult] = await Promise.all([
    cookies(),
    getSession(),
  ])
  const defaultOpen =
    cookieStore.get(siteConfig.cookies.sidebar)?.value === "true"

  const { user, session } = sessionResult

  if (!user || !session) {
    redirect(signInRoute)
  }

  return (
    <NuqsAdapter>
      <TooltipProvider>
        <UserContext
          value={{
            user,
            session,
          }}
        >
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset className="p-2 peer-data-[state=collapsed]:pl-0 md:peer-data-[state=collapsed]:max-w-[calc(100vw-4rem)] md:peer-data-[state=expanded]:max-w-[calc(100vw-16rem)] md:peer-data-[state=expanded]:transition-[max-width] md:peer-data-[state=expanded]:duration-500">
              <div className="relative flex h-full max-h-[calc(100vh-1rem)] flex-col overflow-y-auto border p-3 pt-0">
                <Header />
                {children}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </UserContext>
      </TooltipProvider>
    </NuqsAdapter>
  )
}
