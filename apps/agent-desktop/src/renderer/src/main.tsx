import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { I18nProvider } from "@workspace/i18n/provider"
import { ThemeProvider } from "./components/theme-provider"
import { DesktopConvexProvider } from "./lib/convex-provider"
import { App } from "./App"
import "./styles.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <DesktopConvexProvider>
          <App />
        </DesktopConvexProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>
)
