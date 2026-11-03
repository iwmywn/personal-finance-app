import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig, devices } from "@playwright/test"

import {
  E2E_BASE_URL,
  E2E_DB_NAME,
  E2E_GUEST_STORAGE_STATE,
  E2E_DB_URI,
  E2E_PORT,
  E2E_SETUP_WORKER_COUNT,
  E2E_TIMEZONE,
  getWorkerStorageStatePath,
} from "@/tests/e2e/constants"

const envFilePath = resolve(import.meta.dirname, ".env")
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath)
}

const isRemoteOptIn = process.env.E2E_ALLOW_REMOTE_DB === "true"

const e2eDbUri = isRemoteOptIn ? process.env.DB_URI! : E2E_DB_URI

const e2eEnvOverrides: Record<string, string> = {
  DB_URI: e2eDbUri,
  DB_NAME: E2E_DB_NAME,
  CURRENCY_API_SECRET: "e2e-dummy-currency-api-secret",
  NEXT_PUBLIC_DISABLE_CAPTCHA: "true",
  NEXT_PUBLIC_NODE_ENV: "test",
  NEXT_PUBLIC_URL: E2E_BASE_URL,
  TZ: E2E_TIMEZONE,
}

Object.assign(process.env, e2eEnvOverrides)

const webServerEnv: Record<string, string> = {}
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) {
    webServerEnv[key] = value
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: E2E_SETUP_WORKER_COUNT,
  timeout: 45_000,
  expect: {
    timeout: 15_000,
  },
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: E2E_BASE_URL,
    locale: "en-US",
    timezoneId: E2E_TIMEZONE,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: E2E_GUEST_STORAGE_STATE,
      },
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: getWorkerStorageStatePath(0),
      },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: webServerEnv,
  },
})
