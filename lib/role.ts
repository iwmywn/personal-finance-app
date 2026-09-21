export const USER_ROLE = "user"
export const ADMIN_ROLE = "admin"

export const ROLES = [USER_ROLE, ADMIN_ROLE] as const
export type UserRole = (typeof ROLES)[number]

export const ASSIGNABLE_ROLES = [USER_ROLE] as const
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

export const DEFAULT_ROLE: AssignableRole = USER_ROLE

export function isAdminRole(role: string): boolean {
  return role === ADMIN_ROLE
}
