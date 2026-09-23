"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Laptop, Smartphone } from "lucide-react"
import { useExtracted } from "next-intl"
import { toast } from "sonner"
import { UAParser } from "ua-parser-js"

import { signInRoute } from "@/routes"
import { getLocationFromIP } from "@/actions/location.actions"
import { revokeSessionById } from "@/actions/session.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { useUser } from "@/contexts/user-context"
import { authClient } from "@/lib/auth-client"

export function ActiveSessionsManager() {
  const t = useExtracted()
  const router = useRouter()
  const { session: currentSession, sessions: activeSessions } = useUser()
  const [isTerminating, setIsTerminating] = useState<string | undefined>()
  const [isRevokingAll, setIsRevokingAll] = useState<boolean>(false)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [locations, setLocations] = useState<Record<string, string | null>>({})

  const sortedSessions = useMemo(() => {
    const allSessions = activeSessions.some((s) => s.id === currentSession.id)
      ? activeSessions
      : [currentSession, ...activeSessions]

    return [...allSessions].sort((a, b) => {
      const aIsCurrent = a.id === currentSession.id
      const bIsCurrent = b.id === currentSession.id
      if (aIsCurrent === bIsCurrent) return 0
      return aIsCurrent ? -1 : 1
    })
  }, [activeSessions, currentSession])

  useEffect(() => {
    let isCancelled = false

    if (isOpen && sortedSessions.length > 0) {
      const sessionsToFetch = sortedSessions.filter(
        (s) => s.ipAddress && locations[s.id] === undefined
      )

      if (sessionsToFetch.length === 0) return

      const fetchLocations = async () => {
        const locationPromises = sessionsToFetch.map(async (s) => {
          const location = await getLocationFromIP(s.ipAddress)
          return { id: s.id, location }
        })

        const results = await Promise.all(locationPromises)
        if (!isCancelled) {
          setLocations((prev) => {
            const next = { ...prev }
            results.forEach(({ id, location }) => {
              next[id] = location
            })
            return next
          })
        }
      }

      fetchLocations()
    }

    return () => {
      isCancelled = true
    }
  }, [isOpen, sortedSessions, locations])

  async function handleRevokeSession(sessionId: string) {
    setIsTerminating(sessionId)

    try {
      if (sessionId === currentSession.id && currentSession.impersonatedBy) {
        await authClient.admin.stopImpersonating({
          fetchOptions: {
            onError: () => {
              toast.error(
                t("Failed to terminate session! Please try again later.")
              )
            },
            onSuccess: () => {
              toast.success(t("Session terminated."))
              router.push("/admin")
              router.refresh()
            },
          },
        })

        setIsTerminating(undefined)
        return
      }

      const { error, success } = await revokeSessionById(sessionId)

      if (success === undefined) {
        toast.error(error)
      } else {
        toast.success(success)
        router.refresh()
      }
    } catch {
      toast.error(t("Failed to terminate session! Please try again later."))
    }

    setIsTerminating(undefined)
  }

  async function handleRevokeAllSessions() {
    setIsRevokingAll(true)

    try {
      if (currentSession.impersonatedBy) {
        await authClient.revokeOtherSessions({
          fetchOptions: {
            onError: () => {
              toast.error(
                t("Failed to terminate all sessions! Please try again later.")
              )
            },
          },
        })

        await authClient.admin.stopImpersonating({
          fetchOptions: {
            onError: () => {
              toast.error(
                t("Failed to terminate all sessions! Please try again later.")
              )
            },
            onSuccess: () => {
              toast.success(t("All sessions terminated."))
              router.push("/admin")
              router.refresh()
            },
          },
        })

        setIsRevokingAll(false)
        return
      }

      await authClient.revokeSessions({
        fetchOptions: {
          onError: () => {
            toast.error(
              t("Failed to terminate all sessions! Please try again later.")
            )
          },
          onSuccess: () => {
            toast.success(t("All sessions terminated."))
            router.push(signInRoute)
            router.refresh()
          },
        },
      })
    } catch {
      toast.error(
        t("Failed to terminate all sessions! Please try again later.")
      )
    }

    setIsRevokingAll(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("View Active Sessions")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Active Sessions")}</DialogTitle>
          <DialogDescription>
            {t("Manage your active sessions.")}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {sortedSessions.map((s) => {
            const parser = new UAParser(s.userAgent || "")
            const device = parser.getDevice()
            const os = parser.getOS()
            const browser = parser.getBrowser()
            const isCurrentSession = s.id === currentSession.id
            const location = locations[s.id]

            return (
              <Item key={s.id} variant="outline">
                <ItemMedia variant="icon">
                  {device.type === "mobile" ? (
                    <Smartphone className="text-muted-foreground h-5 w-5" />
                  ) : (
                    <Laptop className="text-muted-foreground h-5 w-5" />
                  )}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>
                    <div>
                      {os.name || s.userAgent || t("Unknown Device")}
                      {browser.name && `, ${browser.name}`}
                    </div>
                    {isCurrentSession && (
                      <>
                        <div>&middot;</div>
                        <div className="text-green-500">{t("Current")}</div>
                      </>
                    )}
                  </ItemTitle>
                  <ItemDescription>
                    {location === undefined ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      (location ?? t("Unknown Location"))
                    )}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeSession(s.id)}
                    disabled={isTerminating === s.id || isRevokingAll}
                  >
                    {isTerminating === s.id && <Spinner />}
                    {t("Terminate")}
                  </Button>
                </ItemActions>
              </Item>
            )
          })}
        </div>
        <Button
          onClick={handleRevokeAllSessions}
          disabled={isRevokingAll || isTerminating !== undefined}
        >
          {isRevokingAll && <Spinner />} {t("Terminate All")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
