import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { NuqsAdapter } from "nuqs/adapters/next/app"

import { signInRoute } from "@/routes"
import { getSession, getSessions } from "@/actions/session.actions"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { UserContext } from "@/contexts/user-context"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [cookieStore, sessionResult, sessionsResult] = await Promise.all([
    cookies(),
    getSession(),
    getSessions(),
  ])
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  const { user, session } = sessionResult
  const { sessions } = sessionsResult

  if (!user || !session || !sessions) {
    redirect(signInRoute)
  }

  return (
    <NuqsAdapter>
      <TooltipProvider>
        <UserContext
          value={{
            user,
            session,
            sessions,
          }}
        >
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset className="p-2 peer-data-[state=collapsed]:pl-0 md:peer-data-[state=collapsed]:max-w-[calc(100vw-4rem)] md:peer-data-[state=expanded]:max-w-[calc(100vw-16rem)] md:peer-data-[state=expanded]:transition-[max-width] md:peer-data-[state=expanded]:duration-500">
              <div className="bg-primary-foreground border-border h-full max-h-[calc(100vh-1rem)] overflow-y-auto border p-2 pt-0 shadow-sm">
                <Header />
                <section className="md:h-full md:max-h-[calc(100vh-4.375rem)]">
                  {children}
                </section>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </UserContext>
      </TooltipProvider>
    </NuqsAdapter>
  )
}
