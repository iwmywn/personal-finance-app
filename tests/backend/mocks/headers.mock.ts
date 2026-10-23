import { headers } from "next/headers"

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}))

beforeEach(() => {
  vi.mocked(headers).mockResolvedValue(new Headers())
})
