import type { Metadata } from "next"
import Link from "next/link"
import { buildMetadata } from "@/lib/seo"

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Page introuvable",
    description:
      "La page demandée est introuvable. Retrouvez nos services consulaires, actualités, représentations et guides.",
    path: "/404",
  }),
  robots: { index: false, follow: true },
}

const QUICK_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/services", label: "Services consulaires" },
  { href: "/news", label: "Actualités" },
  { href: "/reps", label: "Représentations diplomatiques" },
  { href: "/ressources", label: "Ressources & guides" },
  { href: "/faq", label: "Foire aux questions" },
]

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-24 bg-background">
      <div className="max-w-2xl text-center space-y-8">
        <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          Erreur 404
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          Page introuvable
        </h1>
        <p className="text-lg text-muted-foreground">
          Cette page n&apos;existe pas ou a été déplacée. Vous pouvez rejoindre l&apos;une
          des sections principales du portail consulaire ci-dessous.
        </p>
        <nav aria-label="Navigation de secours">
          <ul className="flex flex-wrap justify-center gap-3 pt-4">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  )
}
