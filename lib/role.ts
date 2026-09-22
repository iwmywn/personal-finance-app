export const ADMIN_ROLE = "admin"
const USER_ROLE = "user"

export const ASSIGNABLE_ROLES = [USER_ROLE] as const
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

export const DEFAULT_ROLE: AssignableRole = USER_ROLE

export function isAdminRole(role: string): boolean {
  return role === ADMIN_ROLE
}
