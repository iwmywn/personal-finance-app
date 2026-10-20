vi.mock("next/cache", () => ({
  cacheTag: vi.fn((_tag: string) => {
    // no-op
  }),
  updateTag: vi.fn((_tag: string) => {
    // no-op
  }),
  cacheLife: vi.fn((_options: unknown) => {
    // no-op
  }),
  revalidateTag: vi.fn((_tag: string) => {
    // no-op
  }),
}))

export {}
