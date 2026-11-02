import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import { renderWithProviders } from "@/tests/frontend/helpers/test-providers"
import { mockUser } from "@/tests/shared/data"
import {
  createCustomCategory,
  updateCustomCategory,
} from "@/actions/category.actions"
import { CategoryForm } from "@/components/categories/category-form"
import type { Category } from "@/lib/definitions"

vi.mock("@/actions/category.actions", () => ({
  createCustomCategory: vi.fn(),
  updateCustomCategory: vi.fn(),
}))

describe("CategoryForm", () => {
  const setIsOpen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render create form when category prop is not provided", () => {
    renderWithProviders(<CategoryForm isOpen={true} setIsOpen={setIsOpen} />)

    expect(screen.getByText("Add Category")).toBeInTheDocument()
    expect(
      screen.getByText("Create a custom category for your transactions.")
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/category name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^add$/i })).toBeInTheDocument()
  })

  it("should show validation error when submitting with empty category name", async () => {
    const user = userEvent.setup()
    renderWithProviders(<CategoryForm isOpen={true} setIsOpen={setIsOpen} />)

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/category name is required/i)).toBeInTheDocument()
    })
    expect(createCustomCategory).not.toHaveBeenCalled()
  })

  it("should submit create form with valid inputs and handle success", async () => {
    const user = userEvent.setup()
    vi.mocked(createCustomCategory).mockResolvedValueOnce({
      success: "Category created successfully",
    })

    renderWithProviders(<CategoryForm isOpen={true} setIsOpen={setIsOpen} />)

    const nameInput = screen.getByLabelText(/category name/i)
    const descInput = screen.getByLabelText(/description/i)

    await user.type(nameInput, "Side Hustle")
    await user.type(descInput, "Freelance consulting projects")

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(createCustomCategory).toHaveBeenCalledWith({
        type: "inflow",
        label: "Side Hustle",
        description: "Freelance consulting projects",
      })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Category created successfully"
      )
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show toast error when create action returns an error", async () => {
    const user = userEvent.setup()
    vi.mocked(createCustomCategory).mockResolvedValueOnce({
      error: "Category with this name already exists",
    })

    renderWithProviders(<CategoryForm isOpen={true} setIsOpen={setIsOpen} />)

    const nameInput = screen.getByLabelText(/category name/i)
    const descInput = screen.getByLabelText(/description/i)
    await user.type(nameInput, "Existing Cat")
    await user.type(descInput, "Existing Description")

    const submitBtn = screen.getByRole("button", { name: /^add$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Category with this name already exists"
      )
      expect(setIsOpen).not.toHaveBeenCalledWith(false)
    })
  })

  it("should render edit form with prefilled values and submit update", async () => {
    const user = userEvent.setup()
    const existingCategory: Category = {
      _id: "cat-123",
      userId: mockUser.id,
      label: "Health & Fitness",
      description: "Gym and vitamins",
      type: "outflow",
    }

    vi.mocked(updateCustomCategory).mockResolvedValueOnce({
      success: "Category updated successfully",
    })

    renderWithProviders(
      <CategoryForm
        category={existingCategory}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    expect(screen.getByText("Edit Category")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Health & Fitness")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Gym and vitamins")).toBeInTheDocument()

    const submitBtn = screen.getByRole("button", { name: /^update$/i })
    expect(submitBtn).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/category name/i)
    await user.clear(nameInput)
    await user.type(nameInput, "Health & Wellness")

    await user.click(submitBtn)

    await waitFor(() => {
      expect(updateCustomCategory).toHaveBeenCalledWith("cat-123", {
        type: "outflow",
        label: "Health & Wellness",
        description: "Gym and vitamins",
      })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Category updated successfully"
      )
      expect(setIsOpen).toHaveBeenCalledWith(false)
    })
  })

  it("should show error toast when updateCustomCategory returns an error", async () => {
    const user = userEvent.setup()
    const existingCategory: Category = {
      _id: "cat-123",
      userId: mockUser.id,
      label: "Health & Fitness",
      description: "Gym and vitamins",
      type: "outflow",
    }

    vi.mocked(updateCustomCategory).mockResolvedValueOnce({
      error: "Failed to update category",
    })

    renderWithProviders(
      <CategoryForm
        category={existingCategory}
        isOpen={true}
        setIsOpen={setIsOpen}
      />
    )

    const nameInput = screen.getByLabelText(/category name/i)
    await user.clear(nameInput)
    await user.type(nameInput, "Health & Wellness")

    const submitBtn = screen.getByRole("button", { name: /^update$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update category")
      expect(setIsOpen).not.toHaveBeenCalledWith(false)
    })
  })
})
