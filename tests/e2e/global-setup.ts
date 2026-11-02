import { mkdirSync, rmSync } from "node:fs"
import type { FullConfig } from "@playwright/test"
import { hashPassword, symmetricEncrypt } from "better-auth/crypto"
import { Decimal128, MongoClient, ObjectId } from "mongodb"

import {
  E2E_AUTH_DIR,
  E2E_DB_NAME,
  E2E_DEFAULT_PASSWORD,
  E2E_SETUP_WORKER_COUNT,
  E2E_TOTP_SECRET,
  E2E_USERS,
  getWorkerUsername,
} from "@/tests/e2e/constants"
import { serverEnv } from "@/env/server"
import { SOURCE_LOCALE } from "@/i18n/config"
import { DEFAULT_CURRENCY } from "@/lib/currency"
import { normalizeToUTCMidnight } from "@/lib/date"
import { ensureIndexes } from "@/lib/indexes"
import { ADMIN_ROLE, DEFAULT_ROLE } from "@/lib/role"

type SeedUserConfig = {
  username: string
  name: string
  role: string
  twoFactorEnabled?: boolean
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  if (serverEnv.DB_NAME !== E2E_DB_NAME) {
    throw new Error(
      `Refusing to run E2E global setup: expected DB_NAME="${E2E_DB_NAME}", got "${serverEnv.DB_NAME}".`
    )
  }

  if (config.workers > E2E_SETUP_WORKER_COUNT) {
    throw new Error(
      `Refusing to run E2E global setup: configured workers (${config.workers}) exceeds E2E_SETUP_WORKER_COUNT (${E2E_SETUP_WORKER_COUNT}).`
    )
  }

  rmSync(E2E_AUTH_DIR, { recursive: true, force: true })
  mkdirSync(E2E_AUTH_DIR, { recursive: true })

  const workerCount = E2E_SETUP_WORKER_COUNT
  const client = new MongoClient(serverEnv.DB_URI)
  await client.connect()

  try {
    const db = client.db(serverEnv.DB_NAME)
    if (db.databaseName !== E2E_DB_NAME) {
      throw new Error(
        `Refusing to drop database: expected "${E2E_DB_NAME}", got "${db.databaseName}".`
      )
    }

    await db.dropDatabase()
    await ensureIndexes(db)

    const now = new Date()
    const passwordHash = await hashPassword(E2E_DEFAULT_PASSWORD)

    const userConfigs: SeedUserConfig[] = [
      ...Array.from({ length: workerCount }, (_, index) => ({
        username: getWorkerUsername(index),
        name: `Worker User ${numberToLetters(index)}`,
        role: DEFAULT_ROLE,
      })),
      {
        username: E2E_USERS.admin,
        name: "Admin User",
        role: ADMIN_ROLE,
      },
      {
        username: E2E_USERS.secondaryAdmin,
        name: "Secondary Admin",
        role: ADMIN_ROLE,
      },
      {
        username: E2E_USERS.twoFactor,
        name: "Two Factor User",
        role: DEFAULT_ROLE,
        twoFactorEnabled: true,
      },
      {
        username: E2E_USERS.auth,
        name: "Auth User",
        role: DEFAULT_ROLE,
      },
      {
        username: E2E_USERS.settingsProfile,
        name: "Settings Profile User",
        role: DEFAULT_ROLE,
      },
      {
        username: E2E_USERS.settingsUsername,
        name: "Settings Username User",
        role: DEFAULT_ROLE,
      },
      {
        username: E2E_USERS.settingsPassword,
        name: "Settings Password User",
        role: DEFAULT_ROLE,
      },
      {
        username: E2E_USERS.settingsTwoFactor,
        name: "Settings TwoFactor User",
        role: DEFAULT_ROLE,
      },
      {
        username: E2E_USERS.settingsSessions,
        name: "Settings Sessions User",
        role: DEFAULT_ROLE,
      },
      {
        username: E2E_USERS.settingsPreferences,
        name: "Settings Preferences User",
        role: DEFAULT_ROLE,
      },
      {
        username: E2E_USERS.targetPassword,
        name: "Target Password User",
        role: DEFAULT_ROLE,
      },
      {
        username: E2E_USERS.targetBan,
        name: "Target Ban User",
        role: DEFAULT_ROLE,
      },
      {
        username: E2E_USERS.targetDelete,
        name: "Target Delete User",
        role: DEFAULT_ROLE,
      },
      {
        username: E2E_USERS.targetImpersonate,
        name: "Target Impersonate User",
        role: DEFAULT_ROLE,
      },
    ]

    const userDocs = []
    const accountDocs = []
    let twoFactorUserId: ObjectId | null = null

    for (const cfg of userConfigs) {
      const userId = new ObjectId()
      if (cfg.username === E2E_USERS.twoFactor) {
        twoFactorUserId = userId
      }

      userDocs.push({
        _id: userId,
        name: cfg.name,
        email: `${cfg.username}@e2e.local`,
        emailVerified: true,
        username: cfg.username.toLowerCase(),
        displayUsername: cfg.username,
        role: cfg.role,
        locale: SOURCE_LOCALE,
        currency: DEFAULT_CURRENCY,
        twoFactorEnabled: cfg.twoFactorEnabled ?? false,
        banned: false,
        createdAt: now,
        updatedAt: now,
      })

      accountDocs.push({
        _id: new ObjectId(),
        userId,
        accountId: userId.toString(),
        providerId: "credential",
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      })
    }

    await db.collection("users").insertMany(userDocs)
    await db.collection("accounts").insertMany(accountDocs)

    if (twoFactorUserId) {
      const encryptedSecret = await symmetricEncrypt({
        key: serverEnv.BETTER_AUTH_SECRET,
        data: E2E_TOTP_SECRET,
      })
      const encryptedBackupCodes = await symmetricEncrypt({
        key: serverEnv.BETTER_AUTH_SECRET,
        data: JSON.stringify(["BACKUP-0001", "BACKUP-0002"]),
      })

      await db.collection("twoFactors").insertOne({
        _id: new ObjectId(),
        userId: twoFactorUserId,
        secret: encryptedSecret,
        backupCodes: encryptedBackupCodes,
        verified: true,
        failedVerificationCount: 0,
        lockedUntil: null,
      })
    }

    const todayUtc = normalizeToUTCMidnight(now)
    const dayMs = 24 * 60 * 60 * 1000
    const rateValues = {
      CNY: Decimal128.fromString("7.25"),
      JPY: Decimal128.fromString("150"),
      KRW: Decimal128.fromString("1350"),
      VND: Decimal128.fromString("25000"),
    }

    const exchangeRateDocs = []
    for (let offset = -400; offset <= 7; offset++) {
      exchangeRateDocs.push({
        _id: new ObjectId(),
        date: new Date(todayUtc.getTime() + offset * dayMs),
        rates: rateValues,
      })
    }

    await db.collection("exchangeRates").insertMany(exchangeRateDocs)
  } finally {
    await client.close()
  }
}

function numberToLetters(index: number): string {
  return String.fromCharCode(65 + (index % 26))
}
