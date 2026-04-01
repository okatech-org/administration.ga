import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { I18nProvider } from "@workspace/i18n/provider"
import { DesktopConvexProvider } from "./lib/convex-provider"
import { App } from "./App"
import "./styles.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <DesktopConvexProvider>
        <App />
      </DesktopConvexProvider>
    </I18nProvider>
  </StrictMode>
)
