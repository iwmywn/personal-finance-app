import type { NextURL } from "next/dist/server/web/next-url"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  getSessionCookie,
  parseSetCookieHeader,
  toCookieOptions,
} from "better-auth/cookies"

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

function applyRenewalCookies(response: NextResponse, headers: Headers | null) {
  if (!headers) return

  const setCookieHeader = headers.get("set-cookie")
  if (!setCookieHeader) return

  const parsed = parseSetCookieHeader(setCookieHeader)
  parsed.forEach((cookie, key) => {
    const options = toCookieOptions(cookie)
    // Only forward valid session renewal cookies;
    // never forward deletion cookies (max-age === 0 or empty value)
    if (key && options.maxAge !== 0 && cookie.value !== "") {
      response.cookies.set(key, cookie.value, options)
    }
  })
}

export default async function proxy(request: NextRequest) {
  const { nextUrl } = request
  const { pathname } = nextUrl

  // Passing `_flag: "router"` prevents Better-Auth's `nextCookies` plugin
  // from calling `cookies().set(...)` to delete session cookies on middleware
  // responses when handling stale or in-flight prefetch requests.
  // We use `returnHeaders: true` so legitimate session renewal cookies can be
  // extracted and forwarded to the browser on valid active sessions.
  const sessionResult = await auth.api.getSession({
    headers: request.headers,
    returnHeaders: true,
    _flag: "router",
  } as unknown as Parameters<typeof auth.api.getSession>[0] & {
    returnHeaders: true
    _flag: string
  })

  const session =
    sessionResult && "response" in sessionResult
      ? sessionResult.response
      : (sessionResult as Awaited<ReturnType<typeof auth.api.getSession>>)
  const sessionHeaders =
    sessionResult && "headers" in sessionResult ? sessionResult.headers : null

  if (!session) {
    return redirectIfProtectedRoute(request)
  }

  let response: NextResponse

  if (
    routes.authRoutes.some((route) => pathname.startsWith(route)) ||
    pathname === "/"
  ) {
    response = redirectTo(routes.DEFAULT_SIGNIN_REDIRECT, nextUrl)
  } else if (pathname.startsWith("/admin") && !isAdminRole(session.user.role)) {
    response = redirectTo(routes.DEFAULT_SIGNIN_REDIRECT, nextUrl)
  } else {
    response = NextResponse.next()
  }

  applyRenewalCookies(response, sessionHeaders)

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|images|opengraph-image.png|apple-icon.png|icon.png|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
