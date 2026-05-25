"use client"

import posthog from "posthog-js"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.captureException(error, { digest: error.digest })
    }
  }, [error])

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#f9fafb",
          color: "#111827",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <main
          style={{
            maxWidth: 480,
            width: "100%",
            background: "white",
            padding: 32,
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
          }}
        >
          <h1 style={{ fontSize: 20, marginTop: 0, marginBottom: 12 }}>
            Une erreur inattendue est survenue
          </h1>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>
            Nos équipes ont été notifiées. Vous pouvez réessayer ou recharger la
            page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#111827",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  )
}
