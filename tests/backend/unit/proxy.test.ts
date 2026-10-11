import { NextRequest } from "next/server"

import {
  mockAuthenticatedAdmin,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from "@/tests/backend/mocks/session.mock"
import proxy from "@/proxy"
import * as routes from "@/routes"
import { siteConfig } from "@/app/pfa.config"
import { clientEnv } from "@/env/client"

describe("Proxy (Middleware)", () => {
  describe("Unauthenticated User", () => {
    beforeEach(() => {
      mockUnauthenticatedUser()
    })

    it("should redirect to sign in page with next parameter when accessing a protected route without query params", async () => {
      const request = new NextRequest(
        `${clientEnv.NEXT_PUBLIC_URL}/transactions`
      )

      const response = await proxy(request)

      expect(response.headers.get("location")).toBe(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.signInRoute}?next=%2Ftransactions`
      )
    })

    it("should preserve search query params in next parameter when redirecting to sign in page", async () => {
      const request = new NextRequest(
        `${clientEnv.NEXT_PUBLIC_URL}/transactions?tab=income&month=2`
      )

      const response = await proxy(request)

      expect(response.headers.get("location")).toBe(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.signInRoute}?next=%2Ftransactions%3Ftab%3Dincome%26month%3D2`
      )
    })

    it("should redirect to sign in page when accessing root route /", async () => {
      const request = new NextRequest(`${clientEnv.NEXT_PUBLIC_URL}/`)

      const response = await proxy(request)

      expect(response.headers.get("location")).toBe(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.signInRoute}`
      )
    })

    it("should redirect to sign in page when accessing any unauthenticated non-auth route", async () => {
      const request = new NextRequest(
        `${clientEnv.NEXT_PUBLIC_URL}/unlisted-page`
      )

      const response = await proxy(request)

      expect(response.headers.get("location")).toBe(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.signInRoute}`
      )
    })

    it("should allow unauthenticated access to sign in page", async () => {
      const request = new NextRequest(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.signInRoute}`
      )

      const response = await proxy(request)

      expect(response.headers.get("location")).toBeNull()
      expect(response.headers.get("x-middleware-next")).toBe("1")
    })

    it("should redirect to sign in page when accessing two factor page without 2FA cookie", async () => {
      const request = new NextRequest(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.twoFactorRoute}`
      )

      const response = await proxy(request)

      expect(response.headers.get("location")).toBe(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.signInRoute}`
      )
    })

    it("should allow accessing two factor page when 2FA cookie is present", async () => {
      const request = new NextRequest(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.twoFactorRoute}`,
        {
          headers: {
            cookie: `${siteConfig.name}.${siteConfig.cookies.twoFactor}=valid-2fa-token`,
          },
        }
      )

      const response = await proxy(request)

      expect(response.headers.get("location")).toBeNull()
      expect(response.headers.get("x-middleware-next")).toBe("1")
    })

    it("should allow accessing two factor page with secure prefix 2FA cookie", async () => {
      const request = new NextRequest(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.twoFactorRoute}`,
        {
          headers: {
            cookie: `__Secure-${siteConfig.name}.${siteConfig.cookies.twoFactor}=valid-2fa-token`,
          },
        }
      )

      const response = await proxy(request)

      expect(response.headers.get("location")).toBeNull()
      expect(response.headers.get("x-middleware-next")).toBe("1")
    })
  })

  describe("Authenticated Regular User", () => {
    beforeEach(() => {
      mockAuthenticatedUser()
    })

    it("should allow access to protected routes", async () => {
      const userProtectedRoutes = routes.protectedRoutes.filter(
        (route) => !route.startsWith("/admin")
      )

      for (const route of userProtectedRoutes) {
        const request = new NextRequest(`${clientEnv.NEXT_PUBLIC_URL}${route}`)

        const response = await proxy(request)

        expect(response.headers.get("location")).toBeNull()
        expect(response.headers.get("x-middleware-next")).toBe("1")
      }
    })

    it("should redirect to /home when accessing root /", async () => {
      const request = new NextRequest(`${clientEnv.NEXT_PUBLIC_URL}/`)

      const response = await proxy(request)

      expect(response.headers.get("location")).toBe(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.DEFAULT_SIGNIN_REDIRECT}`
      )
    })

    it("should redirect user away from auth routes to /home", async () => {
      for (const route of routes.authRoutes) {
        const request = new NextRequest(`${clientEnv.NEXT_PUBLIC_URL}${route}`)

        const response = await proxy(request)

        expect(response.headers.get("location")).toBe(
          `${clientEnv.NEXT_PUBLIC_URL}${routes.DEFAULT_SIGNIN_REDIRECT}`
        )
      }
    })

    it("should redirect non-admin user away from /admin to /home", async () => {
      const request = new NextRequest(`${clientEnv.NEXT_PUBLIC_URL}/admin`)

      const response = await proxy(request)

      expect(response.headers.get("location")).toBe(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.DEFAULT_SIGNIN_REDIRECT}`
      )
    })

    it("should redirect non-admin user away from /admin subroutes to /home", async () => {
      const request = new NextRequest(
        `${clientEnv.NEXT_PUBLIC_URL}/admin/users`
      )

      const response = await proxy(request)

      expect(response.headers.get("location")).toBe(
        `${clientEnv.NEXT_PUBLIC_URL}${routes.DEFAULT_SIGNIN_REDIRECT}`
      )
    })
  })

  describe("Authenticated Admin User", () => {
    beforeEach(() => {
      mockAuthenticatedAdmin()
    })

    it(`should allow admin access to /admin`, async () => {
      const request = new NextRequest(`${clientEnv.NEXT_PUBLIC_URL}/admin`)

      const response = await proxy(request)

      expect(response.headers.get("location")).toBeNull()
      expect(response.headers.get("x-middleware-next")).toBe("1")
    })

    it(`should allow admin access to /admin subroutes`, async () => {
      const request = new NextRequest(
        `${clientEnv.NEXT_PUBLIC_URL}/admin/analytics`
      )

      const response = await proxy(request)

      expect(response.headers.get("location")).toBeNull()
      expect(response.headers.get("x-middleware-next")).toBe("1")
    })
  })
})
