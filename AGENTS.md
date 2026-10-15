# AGENTS.MD

## 1. Project Overview & Tech Stack

- **Type**: Web Application (Full-stack).
- **Core**: TypeScript, Next.js 16 (App Router), React 19.
- **Auth**: `better-auth` (with MongoDB adapter).
- **Database**: `mongodb` (raw Node.js driver).
- **UI/Styling**: `tailwindcss` (v4), `shadcn/ui` / `radix-ui`, `lucide-react`, `class-variance-authority`.
- **Forms & Validation**: `react-hook-form`, `@hookform/resolvers`, `zod`.
- **i18n**: `next-intl`.
- **Testing**: `vitest`, `mongodb-memory-server`.
- **Code Health & Audit**: `react-doctor`.
- **Package Manager**: `pnpm`.

## 2. Directory Structure

- `actions/`: Next.js Server Actions for backend data mutations.
- `app/`: Next.js App Router pages, layouts, and API routes.
- `components/`: Reusable React components (UI primitives and domain-specific).
- `contexts/`: React context providers for global state.
- `env/`: Environment variable validation.
- `hooks/`: Custom React hooks.
- `i18n/`: Internationalization config.
- `lib/`: Utility functions, helpers, and integration setup.
- `messages/`: Translation files for internationalization.
- `public/`: Static assets.
- `schemas/`: Zod validation schemas for forms and APIs.
- `scripts/`: Custom utility and automation scripts.
- `tests/`: Vitest test suites.

## 3. Coding Guidelines

- **Style Guide**: Enforced via ESLint (`eslint-config-next`) and Prettier (with Tailwind and import sorting plugins).
- **Naming Conventions**:
  - Standard Next.js conventions (`page.tsx`, `layout.tsx`).
  - Follow kebab-case for file naming conventions.
- **Component Rules**: Keep components modular and isolated. No database calls directly from UI components; always invoke Server Actions.
- **TypeScript**: Strict mode is enabled; ensure strong typing and explicit types where necessary.

## 4. Common Commands

- **Run Dev Server**: `pnpm dev`
- **Build for Production**: `pnpm build`
- **Start Production Server**: `pnpm start`
- **Lint**: `pnpm lint` / `pnpm lint-fix`
- **Format Code**: `pnpm format`
- **Audit React Code**: `pnpm react-doctor`
- **Test**: `pnpm test` (or `test-fe`, `test-be` for specific suites)
- **Diagnose Vitest Performance**: `pnpm test-doctor`

## 5. Notes / Constraints

- **Commands**: Always use pnpm.
- **Environment Variables**: Managed strictly via `@t3-oss/env-nextjs` in the `env/` folder. Do not use `process.env` directly if possible.
- **React Doctor**: Configured in `doctor.config.mjs` to audit React code health, enforce React Compiler compatibility, prevent SSR hydration mismatches, and maintain clean component architecture.
