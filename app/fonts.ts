import { Archivo, IBM_Plex_Mono } from "next/font/google"

const fontDisplay = Archivo({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-display",
})

const fontMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-mono",
})

export { fontDisplay, fontMono }
