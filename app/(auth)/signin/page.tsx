import type { Metadata } from "next"
import { getExtracted } from "next-intl/server"

import { SignInForm } from "@/components/auth/signin-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getExtracted()

  return { title: t("Sign In") }
}

export default function page() {
  return <SignInForm />
}
