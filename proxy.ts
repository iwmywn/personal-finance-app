import type { NextURL } from "next/dist/server/web/next-url"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

import * as routes from "@/routes"
import { siteConfig } from "@/app/pfa.config"
import { auth } from "@/lib/auth"
import { isAdminRole } from "@/lib/role"

function redirectIfProtectedRoute(request: NextRequest) {
  const { nextUrl } = request
  const { pathname, search } = nextUrl

  const hasTwoFactorCookie = !!getSessionCookie(request, {
    cookieName: "two_factor",
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

  const session = await auth.api.getSession({
    headers: request.headers,
  })

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
    "/((?!api|_next/static|_next/image|images|opengraph-image.png|apple-icon.png|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
