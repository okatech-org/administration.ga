import type { Route } from "./components/sidebar/AppSidebar"

/**
 * Map react-router pathnames to the Route objects used by AppSidebar / App.tsx switch.
 *
 * Only the Étape 2 pilot routes are wired below. Sub-routes introduced by
 * the migration (affaires-diplomatiques/cibles, appointments/new, etc.) will
 * be added in Étape 3 alongside the corresponding feature migration.
 */
export function pathToRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/"

  if (path === "/" || path.startsWith("/dashboard")) return { page: "dashboard" }
  if (path.startsWith("/affaires-diplomatiques")) return { page: "affaires-diplomatiques" }
  if (path.startsWith("/affaires-consulaires")) return { page: "affaires-consulaires" }
  if (path.startsWith("/posts")) return { page: "posts" }
  if (path.startsWith("/iboite")) return { page: "iboite" }
  if (path.startsWith("/icorrespondance")) return { page: "icorrespondance" }
  if (path.startsWith("/idocument")) return { page: "idocument" }
  if (path.startsWith("/iagenda")) return { page: "iagenda" }
  if (path.startsWith("/statistics")) return { page: "statistics" }
  if (path.startsWith("/payments")) return { page: "payments" }
  if (path.startsWith("/team")) return { page: "team" }
  if (path.startsWith("/settings")) return { page: "settings" }
  if (path.startsWith("/appointments")) return { page: "appointments" }
  if (path.startsWith("/requests")) return { page: "requests" }
  if (path.startsWith("/services")) return { page: "services" }
  if (path.startsWith("/iarchive")) return { page: "iarchive" }
  if (path.startsWith("/iasted")) return { page: "iasted" }
  if (path.startsWith("/calls")) return { page: "calls" }
  if (path.startsWith("/meetings")) return { page: "meetings" }
  if (path.startsWith("/impression")) return { page: "impression" }

  return { page: "dashboard" }
}

export function routeToPath(route: Route): string {
  if (route.page === "dashboard") return "/"
  return `/${route.page}`
}
