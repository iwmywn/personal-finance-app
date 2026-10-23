/** @type {import('prettier').Config} */
const prettierConfig = {
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
  semi: false,
  trailingComma: "es5",
  importOrder: [
    "^(react/(.*)$)|^(react$)",
    "^(next/(.*)$)|^(next$)",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@/tests/(.*)$",
    "^@/[^/]+$",
    "^@/actions/(.*)$",
    "^@/app/(.*)$",
    "^@/components/ui/(.*)$",
    "^@/components/(.*)$",
    "^@/contexts/(.*)$",
    "^@/env/(.*)$",
    "^@/hooks/(.*)$",
    "^@/i18n/(.*)$",
    "^@/lib/(.*)$",
    "^@/messages/(.*)$",
    "^@/schemas/(.*)$",
    "",
    "^[./]",
  ],
}

export default prettierConfig
