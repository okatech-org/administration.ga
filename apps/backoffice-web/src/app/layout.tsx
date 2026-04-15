import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Admin - Consulat.ga | Back-office d'administration",
  description:
    "Back-office d'administration de la plateforme consulaire de la République Gabonaise.",
  icons: {
    apple: "/icons/apple-icon-180x180.png",
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3b82f6",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
