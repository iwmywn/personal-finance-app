import {
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from "@/tests/backend/mocks/session.mock"
import { getLocationFromIP } from "@/actions/location.actions"

describe("Location Actions", () => {
  describe("Authentication & Session Guards", () => {
    it("should return null when user is not authenticated", async () => {
      mockUnauthenticatedUser()

      const result = await getLocationFromIP("8.8.8.8")

      expect(result).toBeNull()
    })
  })

  describe("Authenticated user", () => {
    beforeEach(() => {
      mockAuthenticatedUser()
    })

    describe("Input Validation", () => {
      it("should return null when ipAddress is null", async () => {
        const result = await getLocationFromIP(null)
        expect(result).toBeNull()
      })

      it("should return null when ipAddress is undefined", async () => {
        const result = await getLocationFromIP(undefined)
        expect(result).toBeNull()
      })

      it("should return null when ipAddress is empty string", async () => {
        const result = await getLocationFromIP("")
        expect(result).toBeNull()
      })

      it("should return null when ipAddress is an invalid IP string", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch")

        expect(await getLocationFromIP("not-an-ip")).toBeNull()
        expect(await getLocationFromIP("999.999.999.999")).toBeNull()
        expect(await getLocationFromIP("1.2.3")).toBeNull()
        expect(await getLocationFromIP("example.com")).toBeNull()

        expect(fetchSpy).not.toHaveBeenCalled()
      })
    })

    describe("Private and Local IP Addresses", () => {
      it("should return 'Local' for loopback and private IPv4 addresses without calling fetch", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch")

        const localIPs = [
          "127.0.0.1",
          "127.0.1.1",
          "10.0.0.1",
          "10.255.255.255",
          "192.168.0.1",
          "192.168.1.100",
          "172.16.0.1",
          "172.20.10.5",
          "172.31.255.255",
        ]

        for (const ip of localIPs) {
          const result = await getLocationFromIP(ip)
          expect(result).toBe("Local")
        }

        expect(fetchSpy).not.toHaveBeenCalled()
      })

      it("should return 'Local' for IPv6 loopback and unspecified addresses without calling fetch", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch")

        expect(await getLocationFromIP("::1")).toBe("Local")
        expect(
          await getLocationFromIP("0000:0000:0000:0000:0000:0000:0000:0000")
        ).toBe("Local")

        expect(fetchSpy).not.toHaveBeenCalled()
      })

      it("should not treat 172.15.x.x or 172.32.x.x as Local and should call fetch", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            region: "Virginia",
            country: "United States",
          }),
        } as Response)

        const result15 = await getLocationFromIP("172.15.0.1")
        expect(result15).toBe("Virginia, United States")

        const result32 = await getLocationFromIP("172.32.0.1")
        expect(result32).toBe("Virginia, United States")

        expect(fetchSpy).toHaveBeenCalledTimes(2)
      })
    })

    describe("Public IP Location Fetching", () => {
      it("should return formatted 'Region, Country' when both are provided by API", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            region: "California",
            country: "United States",
          }),
        } as Response)

        const result = await getLocationFromIP("8.8.8.8")

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(fetchSpy).toHaveBeenCalledWith(
          "https://ipwho.is/8.8.8.8",
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          })
        )
        expect(result).toBe("California, United States")
      })

      it("should return only country when region is missing", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            country: "Vietnam",
          }),
        } as Response)

        const result = await getLocationFromIP("14.161.40.1")

        expect(result).toBe("Vietnam")
      })

      it("should return only region when country is missing", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            region: "Tokyo",
          }),
        } as Response)

        const result = await getLocationFromIP("133.242.0.1")

        expect(result).toBe("Tokyo")
      })

      it("should return null when success is true but region and country are empty", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
          }),
        } as Response)

        const result = await getLocationFromIP("8.8.8.8")

        expect(result).toBeNull()
      })

      it("should return null when API returns success: false", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: false,
            message: "reserved range",
          }),
        } as Response)

        const result = await getLocationFromIP("240.0.0.1")

        expect(result).toBeNull()
      })

      it("should return null when HTTP response is not ok", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response)

        const result = await getLocationFromIP("8.8.8.8")

        expect(result).toBeNull()
      })

      it("should catch fetch errors, log error and return null gracefully", async () => {
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {})
        vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
          new Error("Connection timeout")
        )

        const result = await getLocationFromIP("8.8.8.8")

        expect(result).toBeNull()
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error fetching location from IP: ",
          expect.any(Error)
        )
      })

      it("should handle public IPv6 addresses properly with URL encoding", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            region: "California",
            country: "United States",
          }),
        } as Response)

        const result = await getLocationFromIP("2001:4860:4860::8888")

        expect(fetchSpy).toHaveBeenCalledWith(
          "https://ipwho.is/2001%3A4860%3A4860%3A%3A8888",
          expect.anything()
        )
        expect(result).toBe("California, United States")
      })
    })
  })
})
