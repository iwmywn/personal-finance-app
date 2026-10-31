import * as React from "react"

interface PageLayoutProps {
  title: React.ReactNode
  description: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}

export function PageLayout({
  title,
  description,
  action,
  children,
}: PageLayoutProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-[3.05rem] z-40 flex items-center justify-between gap-3 border-b bg-background/90 py-3 backdrop-blur-xs backdrop-saturate-150">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-primary">
            {title}
          </h1>
          <p className="text-sm text-secondary">{description}</p>
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {children}
    </div>
  )
}
