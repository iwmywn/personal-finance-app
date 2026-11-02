import { randomUUID } from "node:crypto"
import { test as base, expect } from "@playwright/test"

import {
  E2E_SETUP_WORKER_COUNT,
  getWorkerStorageStatePath,
  getWorkerUsername,
} from "@/tests/e2e/constants"

export function uniqueTag(): string {
  return randomUUID().slice(0, 8)
}

type WorkerFixtures = {
  workerUsername: string
}

export const test = base.extend<Record<never, never>, WorkerFixtures>({
  // oxlint-disable-next-line eslint/no-empty-pattern
  storageState: async ({}, use, testInfo) => {
    const workerIndex = testInfo.parallelIndex % E2E_SETUP_WORKER_COUNT
    await use(getWorkerStorageStatePath(workerIndex))
  },
  workerUsername: [
    // oxlint-disable-next-line eslint/no-empty-pattern
    async ({}, use, workerInfo) => {
      const workerIndex = workerInfo.parallelIndex % E2E_SETUP_WORKER_COUNT
      await use(getWorkerUsername(workerIndex))
    },
    { scope: "worker" },
  ],
})

export { expect }
