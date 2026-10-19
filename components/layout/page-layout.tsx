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
    <div className="flex h-auto flex-col gap-3 md:h-full">
      <div className="bg-background/90 sticky top-[3.05rem] z-40 flex items-center justify-between gap-3 border-b py-3 backdrop-blur-xs backdrop-saturate-150">
        <div>
          <h1 className="font-display text-primary text-xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-secondary text-sm">{description}</p>
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {children}
    </div>
  )
}
