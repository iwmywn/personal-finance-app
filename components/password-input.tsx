"use client"

import * as React from "react"
import { cn } from "cn"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useExtracted } from "next-intl"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const disabled =
      props.value === "" || props.value === undefined || props.disabled
    const t = useExtracted()

    return (
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={cn("hide-password-toggle pr-10", className)}
          ref={ref}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
        >
          {showPassword && !disabled ? (
            <EyeIcon className="size-4" aria-hidden="true" />
          ) : (
            <EyeOffIcon className="size-4" aria-hidden="true" />
          )}
          <span className="sr-only">
            {showPassword ? t("Hide password") : t("Show password")}
          </span>
        </Button>

        {/* hides browsers password toggles */}
        <style>{`
					.hide-password-toggle::-ms-reveal,
					.hide-password-toggle::-ms-clear {
						visibility: hidden;
						pointer-events: none;
						display: none;
					}
				`}</style>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
