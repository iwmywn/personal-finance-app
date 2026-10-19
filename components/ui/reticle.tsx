import * as React from "react"
import { cn } from "cn"

function Reticle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "before:bg-line after:bg-line pointer-events-none absolute z-10 h-2.75 w-2.75 before:absolute before:inset-y-0 before:left-1.25 before:w-px after:absolute after:inset-x-0 after:top-1.25 after:h-px",
        className
      )}
      {...props}
    />
  )
}

export function ReticleCorners({ className }: { className?: string }) {
  return (
    <>
      <Reticle className={cn("-top-1.25 -left-1.5", className)} />
      <Reticle className={cn("-top-1.25 -right-1.25", className)} />
      <Reticle className={cn("-bottom-1.25 -left-1.5", className)} />
      <Reticle className={cn("-right-1.25 -bottom-1.25", className)} />
    </>
  )
}
