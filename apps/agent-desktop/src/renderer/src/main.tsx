import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { HashRouter } from "react-router-dom"
import { I18nProvider } from "@workspace/i18n/provider"
import { ReactRouterAdapter } from "@workspace/routing/adapters/react-router"
import { ThemeProvider } from "./components/theme-provider"
import { DesktopConvexProvider } from "./lib/convex-provider"
import { App } from "./App"
import "./styles.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <DesktopConvexProvider>
          <HashRouter>
            <ReactRouterAdapter>
              <App />
            </ReactRouterAdapter>
          </HashRouter>
        </DesktopConvexProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>
)
