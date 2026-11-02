import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 border bg-background px-3 py-1 text-sm transition-colors outline-none placeholder:text-secondary/60",
        "focus-visible:border-ring focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium file:tracking-wider file:text-primary file:uppercase",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
