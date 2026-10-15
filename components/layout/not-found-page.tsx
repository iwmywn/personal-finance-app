"use client"

import Link from "next/link"
import { GhostIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function NotFoundPage() {
  const t = useExtracted()

  return (
    <Empty className="h-full border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GhostIcon />
        </EmptyMedia>
        <EmptyTitle>{t("Page not found")}</EmptyTitle>
        <EmptyDescription>
          {t("The page you are looking for does not exist.")}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/home">{t("Back to Home")}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
