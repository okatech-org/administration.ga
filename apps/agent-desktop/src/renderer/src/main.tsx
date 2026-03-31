import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { DesktopConvexProvider } from "./lib/convex-provider"
import { App } from "./App"
import "./styles.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DesktopConvexProvider>
      <App />
    </DesktopConvexProvider>
  </StrictMode>
)
