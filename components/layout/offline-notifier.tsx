"use client"

import { useEffect, useRef } from "react"
import { useOffline } from "next/offline"
import { WifiOff } from "lucide-react"
import { useExtracted } from "next-intl"
import { toast } from "sonner"

export function OfflineNotifier() {
  const t = useExtracted()
  const isOffline = useOffline()
  const toastId = useRef<string | number | undefined>(undefined)

  useEffect(() => {
    if (isOffline) {
      toastId.current = toast.warning(t("You are currently offline."), {
        duration: Infinity,
        icon: <WifiOff className="size-4" />,
      })
    } else if (toastId.current !== undefined) {
      toast.dismiss(toastId.current)
      toastId.current = undefined
      toast.success(t("You are back online."), { duration: 3000 })
    }
  }, [t, isOffline])

  return null
}
