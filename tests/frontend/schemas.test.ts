import { buildSchemas } from "@/schemas/index"
import { getSchemaMessages } from "@/schemas/messages"

describe("Zod Validation Schemas", async () => {
  const messages = await getSchemaMessages()
  const schemas = buildSchemas(messages)

  describe("createSignInSchema", () => {
    const schema = schemas.createSignInSchema()

    it("should accept valid credentials", () => {
      const result = schema.safeParse({
        username: "valid_user",
        password: "ValidPassword123!",
      })
      expect(result.success).toBe(true)
    })

    it("should reject empty username", () => {
      const result = schema.safeParse({
        username: "",
        password: "ValidPassword123!",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.usernameRequired)
      }
    })

    it("should reject weak passwords", () => {
      const weakPasswords = [
        "short1!", // < 8 chars
        "alllowercase123!", // No uppercase
        "ALLUPPERCASE123!", // No lowercase
        "NoNumbersAtAll!", // No number
        "NoSpecialChar123", // No special character
      ]

      for (const password of weakPasswords) {
        const result = schema.safeParse({
          username: "valid_user",
          password,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(messages.passwordFormat)
        }
      }
    })

    it("should accept passwords with all allowed special characters", () => {
      const specialChars = ["#", "?", "!", "@", "$", "%", "^", "&", "*", "-"]
      for (const char of specialChars) {
        const result = schema.safeParse({
          username: "valid_user",
          password: `P@ssword123${char}`,
        })
        expect(result.success).toBe(true)
      }
    })
  })

  describe("createPasswordSchema", () => {
    const schema = schemas.createPasswordSchema()

    it("should accept matching passwords with revokeOtherSessions flag", () => {
      const result = schema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
        revokeOtherSessions: true,
      })
      expect(result.success).toBe(true)
    })

    it("should reject empty current password", () => {
      const result = schema.safeParse({
        currentPassword: "",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
        revokeOtherSessions: false,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          messages.currentPasswordRequired
        )
      }
    })

    it("should reject mismatched new and confirm passwords", () => {
      const result = schema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
        confirmPassword: "DifferentPassword123!",
        revokeOtherSessions: false,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(
          (i) => i.path[0] === "confirmPassword"
        )
        expect(issue?.message).toBe(messages.passwordsDoNotMatch)
      }
    })
  })

  describe("createTwoFactorCodeSchema", () => {
    const schema = schemas.createTwoFactorCodeSchema()

    it("should accept valid 6 to 10 digit numeric codes", () => {
      expect(schema.safeParse({ code: "123456" }).success).toBe(true)
      expect(schema.safeParse({ code: "12345678" }).success).toBe(true)
      expect(
        schema.safeParse({ code: "1234567890", trustDevice: true }).success
      ).toBe(true)
    })

    it("should reject codes shorter than 6 digits", () => {
      const result = schema.safeParse({ code: "12345" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          messages.authenticatorCodeRequired
        )
      }
    })

    it("should reject codes longer than 10 digits", () => {
      const result = schema.safeParse({ code: "12345678901" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.codeMaxLength)
      }
    })

    it("should reject codes with non-numeric characters", () => {
      const nonNumeric = ["12345a", "123-45", "123 456", "abcdef"]
      for (const code of nonNumeric) {
        const result = schema.safeParse({ code })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(messages.codeDigitsOnly)
        }
      }
    })
  })

  describe("createNameSchema", () => {
    const schema = schemas.createNameSchema()

    it("should accept valid names with unicode, spaces, hyphens, and apostrophes", () => {
      const validNames = [
        "Hoang Anh Tuan",
        "Nguyễn Văn A",
        "Jean-Luc Picard",
        "O'Connor",
        "Renée",
      ]
      for (const name of validNames) {
        expect(schema.safeParse({ name }).success).toBe(true)
      }
    })

    it("should reject empty name", () => {
      const result = schema.safeParse({ name: "" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.nameRequired)
      }
    })

    it("should reject names longer than 100 characters", () => {
      const result = schema.safeParse({ name: "A".repeat(101) })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.nameMaxLength)
      }
    })

    it("should reject names containing numbers or special symbols", () => {
      const invalidNames = ["Tuan123", "User@Name", "First_Last", "Hello!"]
      for (const name of invalidNames) {
        const result = schema.safeParse({ name })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(messages.nameLettersOnly)
        }
      }
    })
  })

  describe("createUsernameSchema", () => {
    const schema = schemas.createUsernameSchema()

    it("should accept valid usernames between 3 and 30 characters", () => {
      const validUsernames = ["tuanh", "john_doe", "user.123", "A_1"]
      for (const username of validUsernames) {
        expect(schema.safeParse({ username }).success).toBe(true)
      }
    })

    it("should reject usernames shorter than 3 characters", () => {
      const result = schema.safeParse({ username: "ab" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.usernameMinLength)
      }
    })

    it("should reject usernames longer than 30 characters", () => {
      const result = schema.safeParse({ username: "a".repeat(31) })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.usernameMaxLength)
      }
    })

    it("should reject usernames with illegal characters", () => {
      const invalidUsernames = [
        "user name",
        "user@name",
        "user-name",
        "user#1",
        "user$test",
      ]
      for (const username of invalidUsernames) {
        const result = schema.safeParse({ username })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(messages.usernameFormat)
        }
      }
    })
  })

  describe("createTransactionSchema", () => {
    const schema = schemas.createTransactionSchema()
    const validBase = {
      type: "outflow" as const,
      categoryKey: "food_beverage",
      currency: "USD" as const,
      amount: "25.50",
      description: "Groceries",
      date: new Date(),
    }

    it("should validate and transform a valid transaction", () => {
      const result = schema.safeParse(validBase)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.amount).toBe("25.5")
        expect(result.data.description).toBe("Groceries")
      }
    })

    it("should accept inflow transaction type", () => {
      const result = schema.safeParse({
        ...validBase,
        type: "inflow",
        categoryKey: "salary_bonus",
      })
      expect(result.success).toBe(true)
    })

    it("should reject invalid transaction type", () => {
      const result = schema.safeParse({ ...validBase, type: "investment" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          messages.transactionTypeRequired
        )
      }
    })

    it("should reject empty categoryKey", () => {
      const result = schema.safeParse({ ...validBase, categoryKey: "" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.categoryRequired)
      }
    })

    it("should reject invalid currency", () => {
      const result = schema.safeParse({ ...validBase, currency: "EUR" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.currencyRequired)
      }
    })

    it("should reject future dates beyond allowable timezone buffer (+14h)", () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const result = schema.safeParse({ ...validBase, date: futureDate })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          messages.dateCannotBeInFuture
        )
      }
    })

    it("should reject description exceeding 200 characters", () => {
      const result = schema.safeParse({
        ...validBase,
        description: "A".repeat(201),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          messages.descriptionMaxLength
        )
      }
    })

    describe("currency amount validation rules", () => {
      it("should accept valid 2-decimal amounts for USD and CNY", () => {
        expect(
          schema.safeParse({
            ...validBase,
            currency: "USD",
            amount: "100.99",
          }).success
        ).toBe(true)
        expect(
          schema.safeParse({
            ...validBase,
            currency: "CNY",
            amount: "50.00",
          }).success
        ).toBe(true)
      })

      it("should reject 3-decimal amounts for USD", () => {
        const result = schema.safeParse({
          ...validBase,
          currency: "USD",
          amount: "100.999",
        })
        expect(result.success).toBe(false)
      })

      it("should reject amounts exceeding 1 trillion", () => {
        const result = schema.safeParse({
          ...validBase,
          currency: "USD",
          amount: "1000000000001",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(messages.amountMax)
        }
      })

      it("should accept integers for zero-decimal currencies (VND, JPY, KRW)", () => {
        expect(
          schema.safeParse({
            ...validBase,
            currency: "VND",
            amount: "500000",
          }).success
        ).toBe(true)
        expect(
          schema.safeParse({
            ...validBase,
            currency: "JPY",
            amount: "1500",
          }).success
        ).toBe(true)
        expect(
          schema.safeParse({
            ...validBase,
            currency: "KRW",
            amount: "20000",
          }).success
        ).toBe(true)
      })

      it("should reject decimal amounts for zero-decimal currencies (VND, JPY, KRW)", () => {
        const zeroDecCurrencies = ["VND", "JPY", "KRW"] as const
        for (const cur of zeroDecCurrencies) {
          const result = schema.safeParse({
            ...validBase,
            currency: cur,
            amount: "100.5",
          })
          expect(result.success).toBe(false)
          if (!result.success) {
            const issue = result.error.issues.find(
              (i) => i.path[0] === "amount"
            )
            expect(issue?.message).toBe(messages.amountInvalidNumber)
          }
        }
      })

      it("should reject amounts less than 1 for zero-decimal currencies", () => {
        const result = schema.safeParse({
          ...validBase,
          currency: "VND",
          amount: "0.50",
        })
        expect(result.success).toBe(false)
      })
    })
  })

  describe("createCategorySchema", () => {
    const schema = schemas.createCategorySchema()

    it("should accept a valid category", () => {
      const result = schema.safeParse({
        type: "outflow",
        label: "Dining Out",
        description: "Restaurant and food delivery expenses",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.label).toBe("Dining Out")
      }
    })

    it("should reject empty or whitespace-only label", () => {
      const result = schema.safeParse({
        type: "outflow",
        label: "   ",
        description: "Valid description",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          messages.categoryNameRequired
        )
      }
    })

    it("should reject label exceeding 50 characters", () => {
      const result = schema.safeParse({
        type: "outflow",
        label: "C".repeat(51),
        description: "Valid description",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          messages.categoryNameMaxLength
        )
      }
    })
  })

  describe("createBudgetSchema", () => {
    const schema = schemas.createBudgetSchema()
    const validBase = {
      categoryKey: "food_beverage",
      currency: "VND" as const,
      allocatedAmount: "5000000",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-31T00:00:00.000Z"),
    }

    it("should accept valid budget date range and amount", () => {
      const result = schema.safeParse(validBase)
      expect(result.success).toBe(true)
    })

    it("should reject endDate that is on or before startDate", () => {
      const sameDate = schema.safeParse({
        ...validBase,
        startDate: new Date("2026-01-15T00:00:00.000Z"),
        endDate: new Date("2026-01-15T00:00:00.000Z"),
      })
      expect(sameDate.success).toBe(false)
      if (!sameDate.success) {
        expect(sameDate.error.issues[0]?.message).toBe(
          messages.endDateAfterStartDate
        )
      }

      const earlierEndDate = schema.safeParse({
        ...validBase,
        startDate: new Date("2026-01-15T00:00:00.000Z"),
        endDate: new Date("2026-01-10T00:00:00.000Z"),
      })
      expect(earlierEndDate.success).toBe(false)
      if (!earlierEndDate.success) {
        expect(earlierEndDate.error.issues[0]?.message).toBe(
          messages.endDateAfterStartDate
        )
      }
    })

    it("should enforce currency precision on allocatedAmount", () => {
      const result = schema.safeParse({
        ...validBase,
        currency: "VND",
        allocatedAmount: "123.45",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(
          (i) => i.path[0] === "allocatedAmount"
        )
        expect(issue?.message).toBe(messages.amountInvalidNumber)
      }
    })
  })

  describe("createGoalSchema", () => {
    const schema = schemas.createGoalSchema()
    const validBase = {
      name: "Emergency Fund",
      categoryKey: "savings_investment",
      currency: "USD" as const,
      targetAmount: "10000.00",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    }

    it("should accept valid financial goal", () => {
      const result = schema.safeParse(validBase)
      expect(result.success).toBe(true)
    })

    it("should reject empty goal name", () => {
      const result = schema.safeParse({ ...validBase, name: "" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.goalNameRequired)
      }
    })

    it("should reject goal name exceeding 100 characters", () => {
      const result = schema.safeParse({ ...validBase, name: "G".repeat(101) })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.goalNameMaxLength)
      }
    })

    it("should reject endDate on or before startDate", () => {
      const result = schema.safeParse({
        ...validBase,
        startDate: new Date("2026-06-01T00:00:00.000Z"),
        endDate: new Date("2026-06-01T00:00:00.000Z"),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          messages.endDateAfterStartDate
        )
      }
    })
  })

  describe("createRecurringTransactionSchema", () => {
    const schema = schemas.createRecurringTransactionSchema()
    const validBase = {
      type: "outflow" as const,
      categoryKey: "housing",
      currency: "USD" as const,
      amount: "1200.00",
      description: "Monthly Apartment Rent",
      frequency: "monthly" as const,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    }

    it("should accept valid standard recurring transaction", () => {
      const result = schema.safeParse(validBase)
      expect(result.success).toBe(true)
    })

    it("should accept frequency 'random' with valid randomEveryXDays", () => {
      const result = schema.safeParse({
        ...validBase,
        frequency: "random",
        randomEveryXDays: 7,
      })
      expect(result.success).toBe(true)
    })

    it("should reject frequency 'random' if randomEveryXDays is missing", () => {
      const result = schema.safeParse({
        ...validBase,
        frequency: "random",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(
          (i) => i.path[0] === "randomEveryXDays"
        )
        expect(issue?.message).toBe(messages.randomDaysRequired)
      }
    })

    it("should reject randomEveryXDays exceeding 365", () => {
      const result = schema.safeParse({
        ...validBase,
        frequency: "random",
        randomEveryXDays: 366,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(
          (i) => i.path[0] === "randomEveryXDays"
        )
        expect(issue?.message).toBe(messages.randomDaysMax)
      }
    })

    it("should reject startDate in the distant past (>12h ago)", () => {
      const pastDate = new Date(Date.now() - 48 * 60 * 60 * 1000)
      const result = schema.safeParse({
        ...validBase,
        startDate: pastDate,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === "startDate")
        expect(issue?.message).toBe(messages.startDateMustBeInFuture)
      }
    })

    it("should reject endDate on or before startDate", () => {
      const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const endDate = new Date(startDate.getTime() - 3600000)
      const result = schema.safeParse({
        ...validBase,
        startDate,
        endDate,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === "endDate")
        expect(issue?.message).toBe(messages.endDateAfterStartDate)
      }
    })
  })

  describe("createAdminUserSchema", () => {
    const schema = schemas.createAdminUserSchema()

    it("should accept valid admin user payload with assignable user role", () => {
      const result = schema.safeParse({
        email: "user@example.com",
        password: "StrongUserPassword123!",
        name: "Normal User",
        username: "normal_user",
        role: "user",
      })
      expect(result.success).toBe(true)
    })

    it("should reject invalid email format", () => {
      const result = schema.safeParse({
        email: "not-an-email",
        password: "StrongUserPassword123!",
        name: "Normal User",
        username: "normal_user",
        role: "user",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.emailInvalid)
      }
    })

    it("should reject invalid role not in ASSIGNABLE_ROLES", () => {
      const result = schema.safeParse({
        email: "user@example.com",
        password: "StrongUserPassword123!",
        name: "Normal User",
        username: "normal_user",
        role: "super_root",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.roleRequired)
      }
    })
  })

  describe("createAdminBanSchema", () => {
    const schema = schemas.createAdminBanSchema()

    it("should accept valid ban reason and duration", () => {
      expect(
        schema.safeParse({
          banReason: "Violated terms of service",
          duration: "7d",
        }).success
      ).toBe(true)

      expect(
        schema.safeParse({
          banReason: "",
          duration: "permanent",
        }).success
      ).toBe(true)

      expect(
        schema.safeParse({
          duration: "1d",
        }).success
      ).toBe(true)
    })

    it("should reject banReason exceeding 200 characters", () => {
      const result = schema.safeParse({
        banReason: "B".repeat(201),
        duration: "7d",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          messages.banReasonMaxLength
        )
      }
    })

    it("should reject empty duration", () => {
      const result = schema.safeParse({
        banReason: "Spam",
        duration: "",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(messages.durationRequired)
      }
    })
  })
})
