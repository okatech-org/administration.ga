/**
 * Mon compte — TRAVAIL.GA.
 *
 * Vue d'ensemble pour les citoyens connectés. Affiche le statut de
 * migration (citoyen ordinaire vs D.E) + accès rapides candidatures.
 */
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { api } from "@convex/_generated/api";
import { pnpeLink } from "@/lib/utils";

export default function MonComptePage() {
  // @ts-expect-error — api typé après codegen
  const status = useQuery(api.functions?.pnpe?.citizenMigration?.migrationStatus) as
    | {
        mode: "DEMANDEUR" | "CITOYEN";
        demandeurId?: string;
        statut?: string;
        totalCandidatures?: number;
        recentCount?: number;
        inviteToMigrate?: boolean;
        softBlock?: boolean;
      }
    | undefined;

  if (status === undefined) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 py-10">
          <div className="container mx-auto px-6 lg:px-10 max-w-3xl">
            <div className="h-64 bg-muted/50 animate-pulse rounded-xl" />
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-6 lg:px-10 max-w-3xl space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">
              Mon compte
            </h1>
            <p className="text-muted-foreground mt-1">
              Suivez vos candidatures et accédez à votre accompagnement PNPE.
            </p>
          </div>

          {/* Status card */}
          {status.mode === "DEMANDEUR" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="size-6 text-emerald-600" />
                <h2 className="font-semibold text-lg">
                  Vous êtes Demandeur d'Emploi PNPE
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Statut compte :{" "}
                <span className="font-medium">{status.statut}</span>. Tirez le
                meilleur parti de votre profil sur PNPE.GA.
              </p>
              <a
                href={pnpeLink("/demandeur")}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Mon espace D.E sur PNPE.GA
                <ArrowRight className="size-4" />
              </a>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <User className="size-6 text-muted-foreground" />
                <h2 className="font-semibold text-lg">Compte citoyen</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {status.totalCandidatures ?? 0} candidature(s) au total,{" "}
                {status.recentCount ?? 0} sur les 30 derniers jours.
              </p>

              {status.softBlock && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 mb-4 text-sm">
                  <strong>Vous postulez régulièrement.</strong> Pour candidater
                  avec un profil complet (CV, antenne, accompagnement
                  conseiller), créez votre profil D.E PNPE.
                </div>
              )}

              {status.inviteToMigrate && !status.softBlock && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4 text-sm">
                  <Sparkles className="size-4 text-amber-600 inline mr-1.5" />
                  <strong>Profitez de l'accompagnement PNPE.</strong> Avec{" "}
                  {status.recentCount} candidatures récentes, vous gagneriez
                  à devenir Demandeur d'Emploi inscrit pour un suivi
                  personnalisé.
                </div>
              )}

              {(status.inviteToMigrate || status.softBlock) && (
                <Link
                  href="/mon-compte/migrer-vers-de"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Devenir D.E PNPE
                  <ArrowRight className="size-4" />
                </Link>
              )}
            </div>
          )}

          {/* Accès rapides */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/mon-compte/candidatures"
              className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <Send className="size-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Mes candidatures</h3>
              <p className="text-sm text-muted-foreground">
                Suivez l'avancement de vos postulations.
              </p>
            </Link>
            <Link
              href="/offres"
              className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <Briefcase className="size-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Parcourir les offres</h3>
              <p className="text-sm text-muted-foreground">
                Catalogue d'offres validées par le PNPE.
              </p>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
