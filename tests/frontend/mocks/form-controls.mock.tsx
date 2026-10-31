import * as React from "react"
import { Controller } from "react-hook-form"
import type { Control, FieldValues } from "react-hook-form"

vi.mock("@/components/category-form-select", () => ({
  CategoryFormSelect: ({ control }: { control: Control<FieldValues> }) => (
    <Controller
      control={control}
      name="categoryKey"
      render={({ field, fieldState }) => (
        <div>
          <label htmlFor="form-category">Category</label>
          <select
            id="form-category"
            value={field.value ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
          >
            <option value="">Select Category</option>
            <option value="food_beverage">Food & Beverage</option>
            <option value="salary">Salary</option>
            <option value="savings_investment">Savings & Investment</option>
          </select>
          {fieldState.error && <span>{fieldState.error.message}</span>}
        </div>
      )}
    />
  ),
}))

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({
    children,
    asChild,
    ...props
  }: React.ComponentProps<"button"> & {
    asChild?: boolean
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(
        children,
        props as React.HTMLAttributes<HTMLElement>
      )
    }
    return (
      <button type="button" {...props}>
        {children}
      </button>
    )
  },
  PopoverContent: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div {...props}>{children}</div>
  ),
}))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => (
    <div>
      <button
        type="button"
        aria-label="Select Budget Start Day"
        onClick={() => onSelect(new Date(2025, 0, 1))}
      >
        Jan 1
      </button>
      <button
        type="button"
        aria-label="Select Budget End Day"
        onClick={() => onSelect(new Date(2025, 0, 31))}
      >
        Jan 31
      </button>
      <button
        type="button"
        aria-label="Pick Goal Start Day"
        onClick={() => onSelect(new Date(2025, 0, 1))}
      >
        Goal Start
      </button>
      <button
        type="button"
        aria-label="Pick Goal End Day"
        onClick={() => onSelect(new Date(2025, 11, 31))}
      >
        Goal End
      </button>
      <button
        type="button"
        aria-label="Choose Picked Day"
        onClick={() => onSelect(new Date(2024, 0, 15))}
      >
        Jan 15
      </button>
      <button
        type="button"
        aria-label="Pick Next Occurrence Day"
        onClick={() => {
          const futureDate = new Date()
          futureDate.setDate(futureDate.getDate() + 5)
          onSelect(futureDate)
        }}
      >
        Select Future Date
      </button>
    </div>
  ),
}))
