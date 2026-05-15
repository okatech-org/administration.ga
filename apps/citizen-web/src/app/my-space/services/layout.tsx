import type { ReactNode } from "react";

// La page utilise `sanitizeHtml` (isomorphic-dompurify → jsdom) qui ne resout pas
// ses assets statiques pendant le prerender Next.js. On force le rendu dynamique
// pour eviter l'erreur "Failed to load external module jsdom" au build.
export const dynamic = "force-dynamic";

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return children;
}
