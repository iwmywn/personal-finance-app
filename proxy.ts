import type { NextURL } from "next/dist/server/web/next-url"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

import { siteConfig } from "@/app/vozix.config"
import { auth } from "@/lib/auth"
import { isAdminRole } from "@/lib/role"
import * as routes from "@/routes"

function redirectIfProtectedRoute(request: NextRequest) {
  const { nextUrl } = request
  const { pathname, search } = nextUrl

  const hasTwoFactorCookie = !!getSessionCookie(request, {
    cookieName: siteConfig.cookies.twoFactor,
    cookiePrefix: siteConfig.name,
  })

  if (pathname === routes.twoFactorRoute && !hasTwoFactorCookie) {
    return redirectTo(routes.signInRoute, nextUrl)
  }

  if (!routes.authRoutes.some((route) => pathname.startsWith(route))) {
    const redirectUrl = new URL(routes.signInRoute, nextUrl)

    if (routes.protectedRoutes.some((route) => pathname.startsWith(route))) {
      redirectUrl.searchParams.set("next", pathname + search)
    }

    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

function redirectTo(pathname: string, nextUrl: NextURL) {
  return NextResponse.redirect(new URL(pathname, nextUrl))
}

export default async function proxy(request: NextRequest) {
  const { nextUrl } = request
  const { pathname } = nextUrl

  // Passing `_flag: "router"` prevents Better-Auth's `nextCookies` plugin
  // from calling `cookies().set(...)` to delete session cookies on middleware
  // responses when handling stale or in-flight prefetch requests.
  const session = await auth.api.getSession({
    headers: request.headers,
    _flag: "router",
  } as unknown as Parameters<typeof auth.api.getSession>[0])

  if (!session) {
    return redirectIfProtectedRoute(request)
  }

  if (
    routes.authRoutes.some((route) => pathname.startsWith(route)) ||
    pathname === "/"
  ) {
    return redirectTo(routes.DEFAULT_SIGNIN_REDIRECT, nextUrl)
  }

  if (pathname.startsWith("/admin") && !isAdminRole(session.user.role)) {
    return redirectTo(routes.DEFAULT_SIGNIN_REDIRECT, nextUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|images|opengraph-image.png|apple-icon.png|icon.png|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
