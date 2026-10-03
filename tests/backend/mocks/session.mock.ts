import {
  mockDBAdminUser,
  mockDBAnotherUser,
  mockDBUser,
} from "@/tests/shared/data"

export const mockGetSession = vi.fn()
export const mockListUsers = vi.fn()
export const mockRemoveUser = vi.fn()

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
      listUsers: mockListUsers,
      removeUser: mockRemoveUser,
    },
  },
}))

export const mockAuthenticatedUser = () => {
  mockGetSession.mockResolvedValue({
    user: {
      ...mockDBUser,
      id: mockDBUser._id.toString(),
    },
    session: {},
  })
}

export const mockAuthenticatedAsAnotherUser = () => {
  mockGetSession.mockResolvedValue({
    user: {
      ...mockDBAnotherUser,
      id: mockDBAnotherUser._id.toString(),
    },
    session: {},
  })
}

export const mockAuthenticatedAdmin = () => {
  mockGetSession.mockResolvedValue({
    user: {
      ...mockDBAdminUser,
      id: mockDBAdminUser._id.toString(),
    },
    session: {},
  })
}

export const mockUnauthenticatedUser = () => {
  mockGetSession.mockResolvedValue(null)
}
