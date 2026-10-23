import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import "@/tests/frontend/mocks/form-controls.mock"

import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { mockUser } from "@/tests/shared/data"
import { createGoal, updateGoal } from "@/actions/goal.actions"
import { GoalForm } from "@/components/goals/goal-form"
import type { Goal } from "@/lib/definitions"

vi.mock("@/actions/goal.actions", () => ({
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
}))

describe("GoalForm", () => {
  const setIsOpen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render create goal form with fields", () => {
    renderWithProviders(<GoalForm isOpen={true} setIsOpen={setIsOpen} />)

    expect(screen.getByText("Add Goal")).toBeInTheDocument()
    expect(screen.getByText("Create a new financial goal.")).toBeInTheDocument()
    expect(screen.getByLabelText(/goal name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^add$/i })).toBeInTheDocument()
  })

  it("should validate required fields when submitting empty form", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderWithProviders(<GoalForm isOpen={true} setIsOpen={setIsOpen} />)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/goal name is required/i)).toBeInTheDocument()
    })
    expect(createGoal).not.toHaveBeenCalled()
  })

  it("should submit create goal form when valid", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    vi.mocked(createGoal).mockResolvedValueOnce({
      success: "Goal created successfully",
    })

    renderWithProviders(<GoalForm isOpen={true} setIsOpen={setIsOpen} />)

    await user.type(screen.getByLabelText(/goal name/i), "House Downpayment")

    const categorySelect = screen.getByLabelText(/category/i)
    await user.selectOptions(categorySelect, "savings_investment")

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, "20000")

    const pickStartBtn = screen.getAllByRole("button", {
      name: "Pick Goal Start Day",
    })[0]
    await user.click(pickStartBtn)

    const pickEndBtn = screen.getAllByRole("button", {
      name: "Pick Goal End Day",
    })[1]
    await user.click(pickEndBtn)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(createGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "House Downpayment",
          categoryKey: "savings_investment",
          currency: mockUser.currency,
          targetAmount: "20000",
        })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Goal created successfully")
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show toast error when create action returns an error", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    vi.mocked(createGoal).mockResolvedValueOnce({
      error: "Goal with this name already exists",
    })

    renderWithProviders(<GoalForm isOpen={true} setIsOpen={setIsOpen} />)

    await user.type(screen.getByLabelText(/goal name/i), "Duplicate Goal")

    const categorySelect = screen.getByLabelText(/category/i)
    await user.selectOptions(categorySelect, "savings_investment")

    const amountInput = screen.getByLabelText(/amount/i)
    await user.type(amountInput, "10000")

    const pickStartBtn = screen.getAllByRole("button", {
      name: "Pick Goal Start Day",
    })[0]
    await user.click(pickStartBtn)

    const pickEndBtn = screen.getAllByRole("button", {
      name: "Pick Goal End Day",
    })[1]
    await user.click(pickEndBtn)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Goal with this name already exists"
      )
      expect(setIsOpen).not.toHaveBeenCalledWith(false)
    })
  })

  it("should render edit form with prefilled values and handle update", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const existingGoal: Goal = {
      _id: "goal-1",
      userId: mockUser.id,
      categoryKey: "savings_investment",
      name: "Emergency Fund",
      currency: "USD",
      targetAmount: "10000",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
    }

    vi.mocked(updateGoal).mockResolvedValueOnce({
      success: "Goal updated successfully",
    })

    renderWithProviders(
      <GoalForm goal={existingGoal} isOpen={true} setIsOpen={setIsOpen} />
    )

    expect(screen.getByText("Edit Goal")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Emergency Fund")).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toHaveValue("$10,000")

    const submitBtn = screen.getByRole("button", { name: /^update$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(updateGoal).toHaveBeenCalledWith(
        "goal-1",
        expect.objectContaining({
          name: "Emergency Fund",
          categoryKey: "savings_investment",
          currency: "USD",
          targetAmount: "10000",
        })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Goal updated successfully")
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show error toast when updateGoal returns an error", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const existingGoal: Goal = {
      _id: "goal-1",
      userId: mockUser.id,
      categoryKey: "savings_investment",
      name: "Emergency Fund",
      currency: "USD",
      targetAmount: "10000",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
    }

    vi.mocked(updateGoal).mockResolvedValueOnce({
      error: "Failed to update goal",
    })

    renderWithProviders(
      <GoalForm goal={existingGoal} isOpen={true} setIsOpen={setIsOpen} />
    )

    const submitBtn = screen.getByRole("button", { name: /^update$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update goal")
      expect(setIsOpen).not.toHaveBeenCalledWith(false)
    })
  })
})
