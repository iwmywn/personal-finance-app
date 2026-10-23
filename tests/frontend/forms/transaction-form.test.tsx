import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import "@/tests/frontend/mocks/form-controls.mock"

import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { mockUser } from "@/tests/shared/data"
import {
  createTransaction,
  updateTransaction,
} from "@/actions/transaction.actions"
import { TransactionForm } from "@/components/transactions/transaction-form"
import type { Transaction } from "@/lib/definitions"

vi.mock("@/actions/transaction.actions", () => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}))

describe("TransactionForm", () => {
  const setIsOpen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render add transaction form with fields", () => {
    renderWithProviders(<TransactionForm isOpen={true} setIsOpen={setIsOpen} />)

    expect(screen.getByText("Add Transaction")).toBeInTheDocument()
    expect(screen.getByText("Inflow")).toBeInTheDocument()
    expect(screen.getByText("Outflow")).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^add$/i })).toBeInTheDocument()
  })

  it("should show validation errors when submitting empty form", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderWithProviders(<TransactionForm isOpen={true} setIsOpen={setIsOpen} />)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
    })
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it("should submit create transaction form with valid values", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    vi.mocked(createTransaction).mockResolvedValueOnce({
      success: "Transaction created successfully",
    })

    renderWithProviders(<TransactionForm isOpen={true} setIsOpen={setIsOpen} />)

    const categorySelect = screen.getByLabelText(/category/i)
    await user.selectOptions(categorySelect, "salary")

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, "1200")

    const descInput = screen.getByLabelText(/description/i)
    await user.type(descInput, "Monthly paycheck")

    const pickDateBtn = screen.getByRole("button", {
      name: "Choose Picked Day",
    })
    await user.click(pickDateBtn)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "inflow",
          categoryKey: "salary",
          currency: mockUser.currency,
          amount: "1200",
          description: "Monthly paycheck",
        })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Transaction created successfully"
      )
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show error toast when createTransaction returns an error", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    vi.mocked(createTransaction).mockResolvedValueOnce({
      error: "Failed to create transaction",
    })

    renderWithProviders(<TransactionForm isOpen={true} setIsOpen={setIsOpen} />)

    const categorySelect = screen.getByLabelText(/category/i)
    await user.selectOptions(categorySelect, "salary")

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, "1200")

    const descInput = screen.getByLabelText(/description/i)
    await user.type(descInput, "Monthly paycheck")

    const pickDateBtn = screen.getByRole("button", {
      name: "Choose Picked Day",
    })
    await user.click(pickDateBtn)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create transaction")
      expect(setIsOpen).not.toHaveBeenCalledWith(false)
    })
  })

  it("should render edit transaction form with prefilled values and submit update", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const existingTransaction: Transaction = {
      _id: "tx-1",
      userId: mockUser.id,
      type: "outflow",
      categoryKey: "food_beverage",
      currency: "USD",
      amount: "45.50",
      description: "Grocery run",
      date: new Date("2024-02-10"),
    }

    vi.mocked(updateTransaction).mockResolvedValueOnce({
      success: "Transaction updated successfully",
    })

    renderWithProviders(
      <TransactionForm
        transaction={existingTransaction}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    expect(screen.getByText("Edit Transaction")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Grocery run")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /^update$/i })
    ).toBeInTheDocument()

    const submitBtn = screen.getByRole("button", { name: /^update$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(updateTransaction).toHaveBeenCalledWith(
        "tx-1",
        expect.objectContaining({
          type: "outflow",
          categoryKey: "food_beverage",
          currency: "USD",
          amount: "45.5",
          description: "Grocery run",
        })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Transaction updated successfully"
      )
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show error toast when updateTransaction returns an error", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const existingTransaction: Transaction = {
      _id: "tx-1",
      userId: mockUser.id,
      type: "outflow",
      categoryKey: "food_beverage",
      currency: "USD",
      amount: "45.50",
      description: "Grocery run",
      date: new Date("2024-02-10"),
    }

    vi.mocked(updateTransaction).mockResolvedValueOnce({
      error: "Failed to update transaction",
    })

    renderWithProviders(
      <TransactionForm
        transaction={existingTransaction}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    const submitBtn = screen.getByRole("button", { name: /^update$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update transaction")
      expect(setIsOpen).not.toHaveBeenCalledWith(false)
    })
  })
})
