# AGENTS.md

Repository guidelines and architectural invariants for personal-finance-app.

## Environment & Verification

Run all package commands with `pnpm`:

- **Audit React Code**: `pnpm react-doctor` — verifies React 19 compiler compatibility, hooks hygiene, and hydration safety.
- **Run Frontend Tests**: `pnpm test:fe` — UI component tests (`happy-dom`).
- **Run Backend Tests**: `pnpm test:be` — integration tests (`node` + in-memory MongoDB replica set).
- **Run Test Coverage**: `pnpm test:coverage` — enforces 90% coverage threshold (85% branches).
- **Validate Translations**: `pnpm check:po` — checks for untranslated strings in `messages/*.po`.
- **Sync Agent Skills**: `pnpm skills:install` — restores community skills from `skills-lock.json`.

## Architectural Invariants

### 1. Data Layer & Server Boundaries

- **Database Access**: Raw MongoDB Node.js driver (no ORM). Retrieve typed collections via factory functions in `lib/collections.ts`. Wrap multi-document mutations in `withTransaction` (`lib/db.ts`).
- **Server Boundaries**: Isolate server code with `import "server-only"`.
- **Data Mutations**: Route all state mutations strictly through Server Actions in `actions/` marked with `"use server"`. UI components remain pure presenters.
- **Validation & Rate Limiting**: Validate Server Action inputs with Zod schemas from `schemas/server.ts`. Protect sensitive endpoints with `isRateLimited` (`lib/rate-limit.ts`).

### 2. Environment Configuration

- Access environment variables exclusively via typed helpers in `@/env/client` or `@/env/server` (`@t3-oss/env-nextjs`). Never access `process.env` directly in application code.

### 3. Internationalization (`next-intl`)

- Base strings live directly in source code (`actions/`, `app/`, `components/`, `hooks/`, `lib/`, `schemas/`). `next build` / `next dev` extracts them into `messages/en-US.po`.
- Keep `messages/en-US.po` strictly as auto-generated output (never edit it manually).
- Provide localized translations in target files (`vi-VN.po`, `ja-JP.po`, `ko-KR.po`, `zh-CN.po`) and run `pnpm check:po` to verify completeness.

### 4. Code Conventions

- **File Naming**: Use `kebab-case.ts(x)` for all files.
- **Module Resolution**: Use `@/*` alias for root-relative imports.

## Context Pointers

Load specialized skills when entering these distinct workflow branches:

- **UI & HUD Design System**: [.agents/skills/precision-hud/SKILL.md](.agents/skills/precision-hud/SKILL.md) — When designing, building, or styling pages, forms, tables, dashboards, cards, or dialogs according to the Technical Instrument & Precision HUD design language.
- **Test-Driven Development**: [.agents/skills/tdd/SKILL.md](.agents/skills/tdd/SKILL.md) — When developing features or fixing bugs test-first with unit or integration tests.
- **Bug Diagnosis**: [.agents/skills/diagnosing-bugs/SKILL.md](.agents/skills/diagnosing-bugs/SKILL.md) — When troubleshooting unexpected errors, memory leaks, or flaky tests.
- **Code Review**: [.agents/skills/code-review/SKILL.md](.agents/skills/code-review/SKILL.md) — When evaluating branch changes against repo standards and functional specs.
- **Deep Module Architecture**: [.agents/skills/codebase-design/SKILL.md](.agents/skills/codebase-design/SKILL.md) — When designing interface seams, modularizing logic, or refactoring services.
