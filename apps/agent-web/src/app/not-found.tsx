export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1rem" }}>
      <h2 style={{ fontSize: "2rem", fontWeight: "bold" }}>404</h2>
      <p>Page introuvable</p>
      <a href="/" style={{ color: "#3b82f6", textDecoration: "underline" }}>
        Retour
      </a>
    </div>
  )
}
