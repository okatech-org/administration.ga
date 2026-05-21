import { ImageResponse } from "next/og"

export const alt = "Consulat.ga — Services administratifs de la République Gabonaise"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "72px",
        background:
          "linear-gradient(135deg, #009E60 0%, #0a4a3a 50%, #003DA5 100%)",
        color: "white",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          fontSize: "32px",
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        <div
          style={{
            width: "12px",
            height: "48px",
            background: "#FCD116",
            borderRadius: "2px",
          }}
        />
        Consulat.ga
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            fontSize: "64px",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            maxWidth: "880px",
          }}
        >
          Services administratifs en ligne
        </div>
        <div
          style={{
            fontSize: "28px",
            opacity: 0.85,
            maxWidth: "880px",
          }}
        >
          Plateforme officielle de la République Gabonaise
        </div>
      </div>
      <div
        style={{
          fontSize: "22px",
          opacity: 0.7,
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        CNI · Passeport · État civil · Fiscalité · Foncier
      </div>
    </div>,
    { ...size },
  )
}
