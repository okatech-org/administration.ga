import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: "intent",
    // Ne pas re-exécuter les loaders si les données ont moins de 30s.
    // Évite le flash de "loading" lors des retours sur une page déjà visitée.
    defaultPreloadStaleTime: 30_000,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
