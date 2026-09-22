import { mockTransactions } from "@/tests/shared/data"
import { sanitizeCSVField } from "@/components/transactions/export-button"
import {
  convertAmountWithRates,
  formatCurrency,
  getSafeCallbackUrl,
  getUniqueYears,
} from "@/lib/utils"

describe("Utils", () => {
  describe("formatCurrency", () => {
    it("should format currency in VND", () => {
      const result = formatCurrency("1000000", "vi-VN", "VND")
      expect(result).toContain("1.000.000")
      expect(result).toContain("₫")
    })

    it("should handle zero amount", () => {
      const result = formatCurrency("0", "vi-VN", "VND")
      expect(result).toContain("0")
      expect(result).toContain("₫")
    })

    it("should handle negative amount", () => {
      const result = formatCurrency("-500000", "vi-VN", "VND")
      expect(result).toContain("-500.000")
      expect(result).toContain("₫")
    })

    it("should handle decimal amounts", () => {
      const result = formatCurrency("1234567.89", "vi-VN", "VND")
      expect(result).toContain("1.234.568")
      expect(result).toContain("₫")
    })

    it("should handle large amounts", () => {
      const result = formatCurrency("1000000000", "vi-VN", "VND")
      expect(result).toContain("1.000.000.000")
      expect(result).toContain("₫")
    })
  })

  describe("getUniqueYears", () => {
    it("should return unique years sorted descending", () => {
      const result = getUniqueYears(mockTransactions)
      expect(result).toEqual([2025, 2024])
    })

    it("should return empty array for empty transactions", () => {
      const result = getUniqueYears([])
      expect(result).toEqual([])
    })

    it("should handle single year", () => {
      const singleYear = mockTransactions.slice(1, 3)
      const result = getUniqueYears(singleYear)
      expect(result).toEqual([2024])
    })
  })

  describe("getSafeCallbackUrl", () => {
    it("should return valid relative route", () => {
      expect(getSafeCallbackUrl("/transactions")).toBe("/transactions")
      expect(getSafeCallbackUrl("/budgets?month=01")).toBe("/budgets?month=01")
      expect(getSafeCallbackUrl("/home#section")).toBe("/home#section")
    })

    it("should fallback when url is null or undefined or empty", () => {
      expect(getSafeCallbackUrl(null)).toBe("/home")
      expect(getSafeCallbackUrl(undefined)).toBe("/home")
      expect(getSafeCallbackUrl("")).toBe("/home")
      expect(getSafeCallbackUrl(null, "/settings")).toBe("/settings")
    })

    it("should reject absolute URLs with schemes to prevent Open Redirect", () => {
      expect(getSafeCallbackUrl("https://evil.com")).toBe("/home")
      expect(getSafeCallbackUrl("http://evil.com")).toBe("/home")
      expect(getSafeCallbackUrl("javascript:alert(1)")).toBe("/home")
      expect(getSafeCallbackUrl("data:text/html,test")).toBe("/home")
    })

    it("should reject protocol-relative URLs", () => {
      expect(getSafeCallbackUrl("//evil.com")).toBe("/home")
      expect(getSafeCallbackUrl("//evil.com/login")).toBe("/home")
    })

    it("should reject backslash bypasses", () => {
      expect(getSafeCallbackUrl("/\\evil.com")).toBe("/home")
      expect(getSafeCallbackUrl("/evil.com\\test")).toBe("/home")
    })
  })

  describe("sanitizeCSVField", () => {
    it("should quote normal fields and escape double quotes", () => {
      expect(sanitizeCSVField("Grocery")).toBe('"Grocery"')
      expect(sanitizeCSVField('Dinner "with" friends')).toBe(
        '"Dinner ""with"" friends"'
      )
    })

    it("should prefix formulas with single quote to prevent CSV injection", () => {
      expect(sanitizeCSVField("=SUM(A1:A10)")).toBe('"\'=SUM(A1:A10)"')
      expect(sanitizeCSVField("+12345")).toBe('"\' +12345"'.replace(" ", ""))
      expect(sanitizeCSVField("-100")).toBe('"\' -100"'.replace(" ", ""))
      expect(sanitizeCSVField("@SUM")).toBe('"\'@SUM"')
      expect(sanitizeCSVField("\tCMD")).toBe('"\'\tCMD"')
      expect(sanitizeCSVField("\rCMD")).toBe('"\'\rCMD"')
    })
  })

  describe("convertAmountWithRates", () => {
    const mockRates = {
      USD: "1",
      VND: "25000",
      EUR: "0.92",
    }

    it("should return original amount when from and to currencies are identical", () => {
      const result = convertAmountWithRates(100, "USD", "USD", mockRates)
      expect(result.toString()).toBe("100")
    })

    it("should return original amount when rates is undefined", () => {
      const result = convertAmountWithRates(100, "USD", "VND", undefined)
      expect(result.toString()).toBe("100")
    })

    it("should return original amount when currency is missing in rates", () => {
      const result = convertAmountWithRates(
        100,
        "USD",
        "JPY" as never,
        mockRates as never
      )
      expect(result.toString()).toBe("100")
    })

    it("should convert currency correctly", () => {
      // 100 USD to VND = 100 * 25000 = 2500000
      const result = convertAmountWithRates(100, "USD", "VND", mockRates)
      expect(result.toString()).toBe("2500000")

      // 25000 VND to USD = 25000 / 25000 = 1
      const resultUSD = convertAmountWithRates(25000, "VND", "USD", mockRates)
      expect(resultUSD.toString()).toBe("1")
    })

    it("should handle zero or negative rate defensively without throwing Division by zero", () => {
      const zeroFromRates = {
        USD: "1",
        VND: "0",
      }
      expect(() =>
        convertAmountWithRates(100, "VND", "USD", zeroFromRates)
      ).not.toThrow()
      const zeroFromResult = convertAmountWithRates(
        100,
        "VND",
        "USD",
        zeroFromRates
      )
      expect(zeroFromResult.toString()).toBe("100")

      const zeroToRates = {
        USD: "0",
        VND: "25000",
      }
      expect(() =>
        convertAmountWithRates(100, "VND", "USD", zeroToRates)
      ).not.toThrow()
      const zeroToResult = convertAmountWithRates(
        100,
        "VND",
        "USD",
        zeroToRates
      )
      expect(zeroToResult.toString()).toBe("100")

      const negativeRates = {
        USD: "1",
        VND: "-25000",
      }
      expect(() =>
        convertAmountWithRates(100, "VND", "USD", negativeRates)
      ).not.toThrow()
      const negResult = convertAmountWithRates(100, "VND", "USD", negativeRates)
      expect(negResult.toString()).toBe("100")
    })
  })
})
