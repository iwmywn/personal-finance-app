import Image from "next/image"
import type { ImageProps } from "next/image"
import { cn } from "cn"

import { siteConfig } from "@/app/pfa.config"

interface LogoProps extends Omit<ImageProps, "src" | "alt"> {
  isLoading?: boolean
}

export function Logo({
  width = 32,
  height = 32,
  className,
  isLoading,
  ...props
}: LogoProps) {
  return (
    <Image
      src="/images/logo.png"
      alt={`${siteConfig.name} Logo`}
      width={width}
      height={height}
      aria-label={isLoading ? "Loading" : undefined}
      className={cn(isLoading && "animate-spin", className)}
      {...props}
    />
  )
}
