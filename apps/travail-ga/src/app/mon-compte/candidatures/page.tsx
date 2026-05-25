"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { authClient } from "@/lib/auth-client";
import { api } from "@workspace/api/convex/_generated/api";

export default function MesCandidaturesPage() {
  const { data: session, isPending } = authClient.useSession();

  // @ts-expect-error api.pnpe type apres codegen
  const list = useQuery(
    // @ts-expect-error
    api.pnpe?.citoyenAccount?.listMyCandidatures,
    session?.user ? {} : "skip",
  ) as Array<{
    _id: string;
    offre: { titre: string; reference: string; ville?: string } | null;
    statut: string;
    _creationTime: number;
    lettreMotivation?: string;
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
            href="/auth/connexion?redirect=/mon-compte/candidatures"
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

          <h1 className="text-2xl font-display font-bold mb-1">
            Mes candidatures
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {list?.length ?? 0} candidature{(list?.length ?? 0) > 1 ? "s" : ""}
          </p>

          {!list ? (
            <div className="rounded-xl border p-6 animate-pulse h-32" />
          ) : list.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed p-10 text-center">
              <FileText className="size-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">
                Vous n'avez pas encore postule a une offre.
              </p>
              <Link
                href="/offres"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Voir les offres
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((c) => (
                <li
                  key={c._id}
                  className="rounded-xl border bg-card p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {c.offre?.titre ?? "Offre supprimee"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.offre?.ville && <>{c.offre.ville} • </>}
                        Postule le{" "}
                        {new Date(c._creationTime).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {c.statut}
                    </span>
                  </div>
                  {c.offre && (
                    <Link
                      href={`/offres/${c.offre.reference}`}
                      className="mt-3 inline-block text-sm text-primary hover:underline"
                    >
                      Voir l'offre →
                    </Link>
                  )}
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
