import * as React from "react"
import { cn } from "cn"

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SummaryCardProps {
  title: React.ReactNode
  icon: React.ReactNode
  value: React.ReactNode
  valueClassName: string
  description: React.ReactNode
}

export function SummaryCard({
  title,
  icon,
  value,
  valueClassName,
  description,
}: SummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm tracking-wider uppercase">
          {title}
        </CardTitle>
        <CardAction>{icon}</CardAction>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-bold tracking-tight wrap-anywhere",
            valueClassName
          )}
        >
          {value}
        </div>
        <div className={"text-secondary mt-1 text-xs tracking-wider uppercase"}>
          {description}
        </div>
      </CardContent>
    </Card>
  )
}
