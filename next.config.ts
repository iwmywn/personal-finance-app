import "./env/client"
import "./env/server"

import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

import { LOCALES, SOURCE_LOCALE } from "@/i18n/config"

const withNextIntl = createNextIntlPlugin({
  experimental: {
    srcPath: [
      "./actions",
      "./app",
      "./components",
      "./hooks",
      "./lib",
      "./schemas",
    ],
    extract: true,
    messages: {
      format: "po",
      path: "./messages",
      locales: LOCALES,
      sourceLocale: SOURCE_LOCALE,
      precompile: true,
    },
  },
})

const nextConfig: NextConfig = {
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    turbopackRustReactCompiler: true,
    scrollRestoration: true,
    useOffline: true,
    cpus: 1,
    staleTimes: {
      dynamic: 300,
      static: 180,
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
}

export default withNextIntl(nextConfig)
