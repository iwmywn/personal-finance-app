import { cpus } from "node:os"
import { resolve } from "node:path"

export const E2E_DB_NAME = "pfa_test"
export const E2E_PORT = 3100
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`
export const E2E_TIMEZONE = "Asia/Ho_Chi_Minh"

export const E2E_DEFAULT_PASSWORD = "Password123!"
export const E2E_TOTP_SECRET = "e2e-2fa-totp-secret-32-chars-key"

export const E2E_SETUP_WORKER_COUNT = process.env.CI
  ? 2
  : Math.max(1, Math.floor(cpus().length / 2))

export const E2E_AUTH_DIR = resolve(process.cwd(), "test-results/.auth")

export function getWorkerUsername(index: number): string {
  return `e2e_worker_${index}`
}

export function getWorkerStorageStatePath(index: number): string {
  return resolve(E2E_AUTH_DIR, `worker-${index}.json`)
}

export const E2E_USERS = {
  admin: "e2e_admin",
  secondaryAdmin: "e2e_admin_secondary",
  twoFactor: "e2e_2fa_user",
  auth: "e2e_auth_user",
  settingsProfile: "e2e_settings_profile",
  settingsPassword: "e2e_settings_password",
  settingsTwoFactor: "e2e_settings_2fa",
  settingsSessions: "e2e_settings_sessions",
  settingsPreferences: "e2e_settings_prefs",
  targetPassword: "e2e_target_password",
  targetBan: "e2e_target_ban",
  targetDelete: "e2e_target_delete",
  targetImpersonate: "e2e_target_impersonate",
} as const

export const E2E_GUEST_STORAGE_STATE = {
  cookies: [
    {
      name: "locale",
      value: "en-US",
      domain: "localhost",
      path: "/",
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    },
  ],
  origins: [],
}
