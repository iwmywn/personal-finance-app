import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import "@/tests/frontend/mocks/form-controls.mock"
import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { mockUser } from "@/tests/shared/data"
import { createBudget, updateBudget } from "@/actions/budget.actions"
import { BudgetForm } from "@/components/budgets/budget-form"
import type { Budget } from "@/lib/definitions"

vi.mock("@/actions/budget.actions", () => ({
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
}))

describe("BudgetForm", () => {
  const setIsOpen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render create budget form with fields", () => {
    renderWithProviders(<BudgetForm isOpen={true} setIsOpen={setIsOpen} />)

    expect(screen.getByText("Add Budget")).toBeInTheDocument()
    expect(
      screen.getByText("Create a budget for a category to track your spending.")
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^add$/i })).toBeInTheDocument()
  })

  it("should validate required fields when submitting empty form", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderWithProviders(<BudgetForm isOpen={true} setIsOpen={setIsOpen} />)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/category is required/i)).toBeInTheDocument()
    })
    expect(createBudget).not.toHaveBeenCalled()
  })

  it("should submit create budget form when valid", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    vi.mocked(createBudget).mockResolvedValueOnce({
      success: "Budget created successfully",
    })

    renderWithProviders(<BudgetForm isOpen={true} setIsOpen={setIsOpen} />)

    const categorySelect = screen.getByLabelText(/category/i)
    await user.selectOptions(categorySelect, "food_beverage")

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, "350")

    // Select start date (Jan 1) from the first calendar instance
    const pickStartBtn = screen.getAllByRole("button", {
      name: "Select Budget Start Day",
    })[0]
    await user.click(pickStartBtn)

    // Select end date (Jan 31) from the second calendar instance
    const pickEndBtn = screen.getAllByRole("button", {
      name: "Select Budget End Day",
    })[1]
    await user.click(pickEndBtn)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(createBudget).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryKey: "food_beverage",
          currency: mockUser.currency,
          allocatedAmount: "350",
        })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Budget created successfully")
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show toast error when create action returns an error", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    vi.mocked(createBudget).mockResolvedValueOnce({
      error: "Category already has a budget",
    })

    renderWithProviders(<BudgetForm isOpen={true} setIsOpen={setIsOpen} />)

    const categorySelect = screen.getByLabelText(/category/i)
    await user.selectOptions(categorySelect, "food_beverage")

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, "350")

    const pickStartBtn = screen.getAllByRole("button", {
      name: "Select Budget Start Day",
    })[0]
    await user.click(pickStartBtn)

    const pickEndBtn = screen.getAllByRole("button", {
      name: "Select Budget End Day",
    })[1]
    await user.click(pickEndBtn)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Category already has a budget")
      expect(setIsOpen).not.toHaveBeenCalledWith(false)
    })
  })

  it("should render edit form with prefilled values", () => {
    const existingBudget: Budget = {
      _id: "budget-1",
      userId: mockUser.id,
      categoryKey: "food_beverage",
      currency: "USD",
      allocatedAmount: "500",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    }

    renderWithProviders(
      <BudgetForm budget={existingBudget} isOpen={true} setIsOpen={setIsOpen} />
    )

    expect(screen.getByText("Edit Budget")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /^update$/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toHaveValue("$500")
  })

  it("should call updateBudget and display success toast on update", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const existingBudget: Budget = {
      _id: "budget-1",
      userId: mockUser.id,
      categoryKey: "food_beverage",
      currency: "USD",
      allocatedAmount: "500",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    }

    vi.mocked(updateBudget).mockResolvedValueOnce({
      success: "Budget updated successfully",
    })

    renderWithProviders(
      <BudgetForm budget={existingBudget} isOpen={true} setIsOpen={setIsOpen} />
    )

    const submitBtn = screen.getByRole("button", { name: /^update$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(updateBudget).toHaveBeenCalledWith(
        "budget-1",
        expect.objectContaining({
          categoryKey: "food_beverage",
          currency: "USD",
          allocatedAmount: "500",
        })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Budget updated successfully")
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show error toast when updateBudget returns an error", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const existingBudget: Budget = {
      _id: "budget-1",
      userId: mockUser.id,
      categoryKey: "food_beverage",
      currency: "USD",
      allocatedAmount: "500",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    }

    vi.mocked(updateBudget).mockResolvedValueOnce({
      error: "Failed to update budget",
    })

    renderWithProviders(
      <BudgetForm budget={existingBudget} isOpen={true} setIsOpen={setIsOpen} />
    )

    const submitBtn = screen.getByRole("button", { name: /^update$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update budget")
      expect(setIsOpen).not.toHaveBeenCalledWith(false)
    })
  })
})
