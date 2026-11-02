---
name: precision-hud
description: Precision HUD & technical instrument design system. Use when designing, building, or styling pages, forms, tables, dashboards, cards, or dialogs.
---

# Precision HUD & Technical Instrument Design System

Production design system guidelines for the application's **Technical Instrument & Precision HUD** aesthetic.

## 1. Core Visual Invariants

1. **Machined 0px Geometry**: Strict `rounded-none` (`--radius: 0rem`) on all interactive and structural elements (buttons, inputs, cards, dialogs, badges, progress bars, tooltips, toasts).
2. **Hairline Structural Grids**: No soft drop shadows (`shadow-none`) or gradient surface washes. Delineate all containers and cells with 1px hairline borders (`border`, `border-border`, `border-line`).
3. **High-Contrast Dualism**:
   - **Light Mode**: Pure white canvas (`#fff`), high-contrast carbon ink text (`#000`), secondary metadata (`#71717a`).
   - **Dark Mode**: Pitch black canvas (`#000`), luminescent phosphor text (`#fff`), secondary metadata (`#a1a1aa`).
   - **High-Contrast Widget Pads**: Embed external non-monochrome widgets (e.g. QR codes) inside an explicit white contrast pad (`bg-white p-3 border`).
4. **Drafting Crosshair Reticles**: Major standalone panels, cards, and modal dialogs feature 11px corner reticles (`<ReticleCorners />`).
5. **Focus States**: Electric avionics blue outline (`focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring`).

## 2. Typography Hierarchy

Fonts are initialized in `app/fonts.ts` and mapped in `app/globals.css`:

- **Display / Headings (`font-display`)**: `Archivo` (weights 400-700) with `tracking-tight` (`-0.025em`) and `text-wrap: balance`. Applied to `h1`-`h6`, card titles, and page headers.
- **HUD Telemetry / Data (`font-mono`)**: `IBM Plex Mono` (weights 400-700). Applied to currency values, transaction amounts, metrics, tabular figures, and timestamps.
- **Eyebrows & Labels**: `text-xs font-semibold uppercase tracking-wider text-secondary`.

## 3. Component Patterns

### 3.1. Page Layout & Sticky Header

Wrap core views in `<PageLayout>` from `@/components/layout/page-layout`:

```tsx
import { PageLayout } from "@/components/layout/page-layout"
import { Button } from "@/components/ui/button"

<PageLayout
  title={t("Title")}
  description={t("Description")}
  action={<Button onClick={...}>{t("Action")}</Button>}
>
  {/* Content */}
</PageLayout>
```

Provides the coordinated sticky header (`sticky top-[3.05rem] z-40 border-b backdrop-blur-xs`) directly below the viewport navigation.

### 3.2. Cards & Reticles

- `<Card>` from `@/components/ui/card` embeds `<ReticleCorners />` by default (`ticks={true}`).
- `<SummaryCard>` from `@/components/summary-card` provides structured telemetry: uppercase header label + bold display metric + secondary mono description.
- For custom borders requiring corner reticles, import `<ReticleCorners />` from `@/components/ui/reticle`.

### 3.3. Buttons (`Button`)

Use `<Button>` from `@/components/ui/button`:

- Sharp geometry (`rounded-none`), uppercase tracking (`text-xs font-semibold uppercase tracking-[0.08em]`).
- Default height: `h-9 px-4 py-2`.

### 3.4. Form Controls & Inputs

- Standard control height: `h-9` (`Input`, `SelectTrigger`).
- Compound inputs with search/icons/clear buttons: Use `<InputGroup>` from `@/components/ui/input-group`.

### 3.5. Data Tables (`Table`)

- Enclosed hairline grid: container uses `border`.
- Header: `TableHeader` with `sticky top-0 z-1 bg-background`.
- Cells & Headers: Both `TableHead` and `TableCell` have right-side dividers: `border-r last:border-r-0`.
- Rows: `TableRow` has `border-b hover:bg-secondary/10 transition-colors`.

### 3.6. Modals & Overlays

- Use `<DialogContent>` from `@/components/ui/dialog` (reticle crosshairs enabled by default via `ticks={true}`, `rounded-none`, and `backdrop-blur-xs`).

### 3.7. Filter System

- Group filter controls in a `<Card>` above tables.
- Active filters must reflect state with `border-primary` (e.g. `selectedFilter && "border-primary!"`).
- Reset control: `variant="outline"` or `variant="ghost"`.

### 3.8. Empty States

Use `<EmptyState>` from `@/components/empty-state` (dashed border with square icon badge).

## 4. Verification Checklist

- [ ] All elements use `rounded-none` (zero border-radius).
- [ ] No `shadow-*` or gradients; hairline `border` only.
- [ ] Standalone panels/cards carry reticles (`ticks={true}`).
- [ ] Headings use `font-display tracking-tight`; numbers/telemetry use `font-mono`.
- [ ] Core pages wrapped in `<PageLayout>`.
- [ ] Table headers and cells include `border-r last:border-r-0`.
- [ ] Active filter inputs highlight with `border-primary`.
- [ ] External/dark-mode widgets (e.g. QR codes) use high-contrast background pads (`bg-white p-3 border`).
