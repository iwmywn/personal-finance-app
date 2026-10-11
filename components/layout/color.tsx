import { PaletteIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const colors = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--border",
  "--input",
  "--ring",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
]

export function Color() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <PaletteIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Color Palette & Tokens</DialogTitle>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {colors.map((color) => (
            <div key={color} className="flex items-center justify-between">
              <span className="font-mono text-sm">{color}</span>
              <div
                className="size-8 rounded border"
                style={{ backgroundColor: `var(${color})` }}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
