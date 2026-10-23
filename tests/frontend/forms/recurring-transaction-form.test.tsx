import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import "@/tests/frontend/mocks/form-controls.mock"

import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { mockUser } from "@/tests/shared/data"
import { createRecurringTransaction } from "@/actions/recurring.actions"
import { RecurringTransactionForm } from "@/components/recurring-transactions/recurring-transaction-form"

vi.mock("@/actions/recurring.actions", () => ({
  createRecurringTransaction: vi.fn(),
}))

describe("RecurringTransactionForm", () => {
  const setIsOpen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render recurring transaction form with all fields", () => {
    renderWithProviders(
      <RecurringTransactionForm isOpen={true} setIsOpen={setIsOpen} />
    )

    expect(screen.getByText("Add Recurring Transaction")).toBeInTheDocument()
    expect(screen.getByText("Inflow")).toBeInTheDocument()
    expect(screen.getByText("Outflow")).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^add$/i })).toBeInTheDocument()
  })

  it("should validate required fields when submitting empty form", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderWithProviders(
      <RecurringTransactionForm isOpen={true} setIsOpen={setIsOpen} />
    )

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
    })
    expect(createRecurringTransaction).not.toHaveBeenCalled()
  })

  it("should submit create recurring transaction with valid inputs", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    vi.mocked(createRecurringTransaction).mockResolvedValueOnce({
      success: "Recurring transaction created successfully",
    })

    renderWithProviders(
      <RecurringTransactionForm isOpen={true} setIsOpen={setIsOpen} />
    )

    const categorySelect = screen.getByLabelText(/category/i)
    await user.selectOptions(categorySelect, "salary")

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, "2500")

    const descInput = screen.getByLabelText(/description/i)
    await user.type(descInput, "Monthly salary inflow")

    const pickDateBtn = screen.getAllByRole("button", {
      name: "Pick Next Occurrence Day",
    })[0]
    await user.click(pickDateBtn)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(createRecurringTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "inflow",
          categoryKey: "salary",
          currency: mockUser.currency,
          amount: "2500",
          description: "Monthly salary inflow",
          frequency: "monthly",
        })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Recurring transaction created successfully"
      )
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show error toast when createRecurringTransaction returns an error", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    vi.mocked(createRecurringTransaction).mockResolvedValueOnce({
      error: "Failed to create recurring transaction",
    })

    renderWithProviders(
      <RecurringTransactionForm isOpen={true} setIsOpen={setIsOpen} />
    )

    const categorySelect = screen.getByLabelText(/category/i)
    await user.selectOptions(categorySelect, "salary")

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, "2500")

    const descInput = screen.getByLabelText(/description/i)
    await user.type(descInput, "Monthly salary inflow")

    const pickDateBtn = screen.getAllByRole("button", {
      name: "Pick Next Occurrence Day",
    })[0]
    await user.click(pickDateBtn)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to create recurring transaction"
      )
      expect(setIsOpen).not.toHaveBeenCalledWith(false)
    })
  })
})
