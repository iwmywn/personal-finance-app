import { resolve } from "node:path"
import { defineConfig } from "vitest/config"
import type { UserWorkspaceConfig } from "vitest/config"

const baseTestConfig = {
  globals: true,
  environment: "node",
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
      include: ["tests/frontend/**/*.test.ts"],
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
  },
})
