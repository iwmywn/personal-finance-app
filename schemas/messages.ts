"use server"

import { getExtracted } from "next-intl/server"

export async function getSchemaMessages() {
  const t = await getExtracted()

  return {
    passwordFormat: t(
      "Password must have at least 8 characters, including uppercase, lowercase, number and special character."
    ),
    amountRequired: t("Amount is required."),
    amountInvalidNumber: t("Amount must be a valid number."),
    amountMin: t("Amount must be greater than 0."),
    amountMax: t("Maximum amount is 100 billion."),
    usernameRequired: t("Username is required."),
    currentPasswordRequired: t("Current password is required."),
    newPasswordRequired: t("New password confirmation is required."),
    passwordsDoNotMatch: t("Passwords do not match."),
    authenticatorCodeRequired: t(
      "Enter the 6-digit code from your authenticator app."
    ),
    codeMaxLength: t("Code must be at most 10 digits."),
    codeDigitsOnly: t("Code can only contain digits."),
    nameRequired: t("Name is required."),
    nameMaxLength: t("Name must be at most 100 characters."),
    nameLettersOnly: t("Name can only contain letters."),
    usernameMinLength: t("Username must have at least 3 characters."),
    usernameMaxLength: t("Username must be at most 30 characters."),
    usernameFormat: t(
      "Username can only contain letters, numbers, underscores, and dots."
    ),
    transactionTypeRequired: t("Transaction type is required."),
    categoryRequired: t("Category is required."),
    currencyRequired: t("Currency is required."),
    descriptionRequired: t("Description is required."),
    descriptionMaxLength: t("Description must be at most 200 characters."),
    dateRequired: t("Date is required."),
    dateCannotBeInFuture: t("Transaction date cannot be in the future."),
    typeRequired: t("Type is required."),
    categoryNameRequired: t("Category name is required."),
    categoryNameMaxLength: t("Category name must be at most 50 characters."),
    startDateRequired: t("Start date is required."),
    endDateRequired: t("End date is required."),
    endDateAfterStartDate: t("End date must be after start date."),
    goalNameRequired: t("Goal name is required."),
    goalNameMaxLength: t("Goal name must be at most 100 characters."),
    frequencyRequired: t("Frequency is required."),
    randomDaysRequired: t("Number of days is required."),
    randomDaysMax: t("The number of days must not exceed 365."),
    expiredRecurringActivation: t(
      "Cannot activate a recurring transaction that has already expired."
    ),
    emailInvalid: t("Please enter a valid email address."),
    roleRequired: t("Role is required."),
    banReasonMaxLength: t("Ban reason must be at most 200 characters."),
    durationRequired: t("Duration is required."),
  }
}

export type SchemaMessages = Awaited<ReturnType<typeof getSchemaMessages>>
