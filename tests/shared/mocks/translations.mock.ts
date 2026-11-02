vi.mock("next-intl/server", async () => ({
  getExtracted: vi.fn(() => {
    return vi.fn((message: string, values?: Record<string, string>) => {
      if (!values) return message

      return message.replace(/\{(\w+)\}/g, (_, key) => {
        return values[key] ?? `{${key}}`
      })
    })
  }),
}))

vi.mock("next-intl", async () => ({
  useExtracted: vi.fn(() => vi.fn((message: string) => message)),
  useLocale: vi.fn(() => "en-US"),
  useTimeZone: vi.fn(() => "UTC"),
}))
