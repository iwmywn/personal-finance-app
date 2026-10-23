import type * as NextServer from "next/server"

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof NextServer>()
  return {
    ...actual,
    after: vi.fn((fn: () => void | Promise<void>) => {
      try {
        const res = fn()
        if (res && typeof (res as Promise<void>).catch === "function") {
          ;(res as Promise<void>).catch(() => {})
        }
      } catch {
        // ignore
      }
    }),
  }
})

export {}
