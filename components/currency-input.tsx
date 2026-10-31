"use client"

import * as React from "react"
import { cn } from "cn"
import type { CurrencyInputProps as ReactCurrencyInputProps } from "react-currency-input-field"
import ReactCurrencyInput from "react-currency-input-field"

import { Input } from "@/components/ui/input"
import { CURRENCY_CONFIG } from "@/lib/currency"
import type { Currency } from "@/lib/currency"

type CurrencyInputProps = ReactCurrencyInputProps & {
  currency: Currency
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, currency, ...props }, ref) => {
    const config = CURRENCY_CONFIG[currency]

    return (
      <ReactCurrencyInput
        ref={ref}
        customInput={Input}
        className={cn(className)}
        placeholder="0"
        intlConfig={{ locale: config.locale, currency }}
        allowNegativeValue={false}
        inputMode="decimal"
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
