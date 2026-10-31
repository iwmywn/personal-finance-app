import { resolve } from "node:path"
import { defineConfig } from "vitest/config"
import type { UserWorkspaceConfig } from "vitest/config"

const baseTestConfig = {
  globals: true,
  pool: "threads",
}
const baseResolveConfig = {
  alias: { "@": resolve(import.meta.dirname, "./") },
}

const projects: UserWorkspaceConfig[] = [
  {
    test: {
      ...baseTestConfig,
      name: "frontend",
      environment: "happy-dom",
      include: ["tests/frontend/**/*.test.{ts,tsx}"],
      setupFiles: ["./tests/frontend/setup.ts"],
    },
    resolve: {
      ...baseResolveConfig,
    },
  },
  {
    test: {
      ...baseTestConfig,
      name: "backend",
      environment: "node",
      include: ["tests/backend/**/*.test.ts"],
      setupFiles: ["./tests/backend/setup.ts"],
      testTimeout: 120_000,
      hookTimeout: 300_000,
    },
    resolve: {
      ...baseResolveConfig,
    },
  },
]

export default defineConfig({
  test: {
    projects,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: [
        "actions/**/*.ts",
        "app/api/**/*.ts",
        "lib/**/*.ts",
        "schemas/**/*.ts",
        "proxy.ts",
      ],
      exclude: [
        "app/api/auth/**",
        "lib/auth-client.ts",
        "lib/auth.ts",
        "lib/definitions.ts",
        "schemas/types.ts",
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
})
