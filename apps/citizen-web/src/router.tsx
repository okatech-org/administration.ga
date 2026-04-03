import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: "intent",
    // Ne pas re-exécuter les loaders si les données ont moins de 30s.
    defaultPreloadStaleTime: 30_000,
    // Afficher le pendingComponent immédiatement (0 latence perçue)
    defaultPendingMs: 0,
    // Garder le pending visible au moins 150ms pour éviter le flash
    defaultPendingMinMs: 150,
    // Transition fluide entre les pages via View Transition API
    defaultViewTransition: true,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
