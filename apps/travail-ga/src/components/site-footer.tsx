import Link from "next/link";
import { Briefcase } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-6 lg:px-10 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Briefcase className="size-4" />
            </div>
            <span className="font-display font-bold text-lg">
              TRAVAIL<span className="text-emerald-500">.GA</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Marché de l'emploi gabonais — offres validées par le PNPE,
            opérateur public sous tutelle du Ministère du Travail.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Navigation</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/offres" className="hover:text-foreground">Offres d'emploi</Link></li>
            <li><Link href="/antennes" className="hover:text-foreground">7 antennes PNPE</Link></li>
            <li><Link href="/je-cherche" className="hover:text-foreground">Je cherche un emploi</Link></li>
            <li><Link href="/je-veux-embaucher" className="hover:text-foreground">Je veux embaucher</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Écosystème</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href="https://emploi.administration.ga"
                className="hover:text-foreground"
              >
                PNPE.GA — Espace opérationnel
              </a>
            </li>
            <li>
              <a
                href="https://demarche.ga"
                className="hover:text-foreground"
              >
                DEMARCHE.GA — Démarches administratives
              </a>
            </li>
            <li>
              <a
                href="https://administration.ga"
                className="hover:text-foreground"
              >
                ADMINISTRATION.GA — Portail national
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container mx-auto px-6 lg:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Pôle National de Promotion de
            l'Emploi — République Gabonaise
          </p>
          <p className="text-xs text-muted-foreground">
            Partenariat technique ANINF — Protocole 17 février 2025
          </p>
        </div>
      </div>
    </footer>
  );
}
