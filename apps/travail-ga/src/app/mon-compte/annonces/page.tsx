"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowLeft, Briefcase, Loader2, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { authClient } from "@/lib/auth-client";
import { api } from "@workspace/api/convex/_generated/api";

export default function MesAnnoncesPage() {
  const { data: session, isPending } = authClient.useSession();

  // @ts-expect-error api.pnpe type apres codegen
  const list = useQuery(
    // @ts-expect-error
    api.functions?.pnpe?.citoyenAccount?.listMyAnnonces,
    session?.user ? {} : "skip",
  ) as Array<{
    _id: string;
    titre: string;
    reference: string;
    statut: string;
    _creationTime: number;
    candidaturesCount: number;
  }> | undefined;

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <Link
            href="/auth/connexion?redirect=/mon-compte/annonces"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Se connecter
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 py-10">
        <div className="container mx-auto px-6 lg:px-10 max-w-4xl">
          <Link
            href="/mon-compte"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="size-3.5" /> Retour au tableau de bord
          </Link>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold mb-1">
                Mes annonces
              </h1>
              <p className="text-sm text-muted-foreground">
                {list?.length ?? 0} annonce{(list?.length ?? 0) > 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/publier-annonce/particulier"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              Publier
            </Link>
          </div>

          {!list ? (
            <div className="rounded-xl border p-6 animate-pulse h-32" />
          ) : list.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed p-10 text-center">
              <Briefcase className="size-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">
                Vous n'avez pas encore publie d'annonce.
              </p>
              <Link
                href="/publier-annonce/particulier"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Publier une annonce
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((a) => (
                <li
                  key={a._id}
                  className="rounded-xl border bg-card p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{a.titre}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Ref. {a.reference} • Publiee le{" "}
                        {new Date(a._creationTime).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {a.statut}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {a.candidaturesCount} candidature
                      {a.candidaturesCount > 1 ? "s" : ""} recue
                      {a.candidaturesCount > 1 ? "s" : ""}
                    </span>
                    <Link
                      href={`/offres/${a.reference}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Voir l'annonce →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
