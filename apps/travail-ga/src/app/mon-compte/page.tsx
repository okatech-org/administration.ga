"use client";

/**
 * Tableau de bord du citoyen ordinaire — TRAVAIL.GA.
 *
 * Affiche les candidatures envoyees et les annonces publiees comme
 * particulier. Pas de profil D.E complet ; pour ca, lien vers PNPE.GA.
 */
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  FileText,
  Briefcase,
  ExternalLink,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { authClient } from "@/lib/auth-client";
import { pnpeLink } from "@/lib/utils";
import { api } from "@workspace/api/convex/_generated/api";

export default function MonComptePage() {
  const { data: session, isPending } = authClient.useSession();

  // @ts-expect-error — api.pnpe type apres codegen
  const myCandidatures = useQuery(
    // @ts-expect-error
    api.pnpe?.citoyenAccount?.listMyCandidatures,
    session?.user ? {} : "skip",
  ) as Array<{
    _id: string;
    offre: { titre: string; reference: string } | null;
    statut: string;
    _creationTime: number;
  }> | undefined;

  // @ts-expect-error
  const myAnnonces = useQuery(
    // @ts-expect-error
    api.pnpe?.citoyenAccount?.listMyAnnonces,
    session?.user ? {} : "skip",
  ) as Array<{
    _id: string;
    titre: string;
    reference: string;
    statut: string;
    _creationTime: number;
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
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center max-w-md mx-auto px-6">
            <h1 className="text-2xl font-bold mb-2">Connexion requise</h1>
            <p className="text-muted-foreground mb-6">
              Connectez-vous pour acceder a votre tableau de bord.
            </p>
            <Link
              href="/auth/connexion?redirect=/mon-compte"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Se connecter
            </Link>
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
        <div className="container mx-auto px-6 lg:px-10 max-w-5xl">
          <header className="mb-8">
            <h1 className="text-3xl font-display font-bold tracking-tight">
              Bonjour {session.user.name?.split(" ")[0] || "vous"} !
            </h1>
            <p className="text-muted-foreground mt-1">
              Suivi de vos candidatures et de vos annonces publiees.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card
              icon={<FileText className="size-5" />}
              title="Mes candidatures"
              count={myCandidatures?.length ?? 0}
              href="/mon-compte/candidatures"
            />
            <Card
              icon={<Briefcase className="size-5" />}
              title="Mes annonces"
              count={myAnnonces?.length ?? 0}
              href="/mon-compte/annonces"
            />
          </div>

          {/* Activite recente */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-4">Activite recente</h2>
            <div className="space-y-3">
              {myCandidatures && myCandidatures.length > 0 ? (
                myCandidatures.slice(0, 5).map((c) => (
                  <ActivityRow
                    key={c._id}
                    icon={<FileText className="size-4" />}
                    title={c.offre?.titre ?? "Offre"}
                    subtitle={`Candidature ${c.statut.toLowerCase()}`}
                    statut={c.statut}
                    date={c._creationTime}
                    href={c.offre ? `/offres/${c.offre.reference}` : undefined}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<FileText className="size-8 text-muted-foreground" />}
                  text="Aucune candidature pour le moment."
                  cta={{ label: "Voir les offres", href: "/offres" }}
                />
              )}
            </div>
          </section>

          {/* Devenir D.E PNPE */}
          <section className="mt-10 rounded-2xl border-2 border-primary/20 bg-primary/5 p-6">
            <h3 className="font-semibold text-lg mb-1">
              Profil D.E complet PNPE
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cree votre profil de Demandeur d'Emploi sur PNPE.GA pour
              candidater avec votre CV, etre matche automatiquement aux
              offres et acceder aux formations.
            </p>
            <a
              href={pnpeLink("/auth/sign-in")}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Aller sur PNPE.GA <ExternalLink className="size-3.5" />
            </a>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Card({
  icon,
  title,
  count,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-card p-5 hover:border-primary/40 transition-colors flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-2xl font-bold tabular-nums">{count}</div>
        </div>
      </div>
      <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
    </Link>
  );
}

function ActivityRow({
  icon,
  title,
  subtitle,
  statut,
  date,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  statut: string;
  date: number;
  href?: string;
}) {
  const Wrapper = href ? Link : "div";
  return (
    <Wrapper
      // @ts-expect-error union
      href={href}
      className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:border-primary/30 transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <StatusBadge statut={statut} />
      <div className="text-xs text-muted-foreground hidden sm:block">
        <Clock className="size-3 inline mr-1" />
        {new Date(date).toLocaleDateString("fr-FR")}
      </div>
    </Wrapper>
  );
}

function StatusBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    NOUVELLE: {
      label: "Nouvelle",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <Clock className="size-3" />,
    },
    EN_COURS: {
      label: "En cours",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Clock className="size-3" />,
    },
    PRESELECTIONNE: {
      label: "Preselectionne",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="size-3" />,
    },
    EMBAUCHE: {
      label: "Embauche",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="size-3" />,
    },
    REJETE: {
      label: "Rejete",
      cls: "bg-rose-50 text-rose-700 border-rose-200",
      icon: <XCircle className="size-3" />,
    },
  };
  const entry = map[statut] ?? {
    label: statut,
    cls: "bg-muted text-muted-foreground border",
    icon: null,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${entry.cls}`}
    >
      {entry.icon}
      {entry.label}
    </span>
  );
}

function EmptyState({
  icon,
  text,
  cta,
}: {
  icon: React.ReactNode;
  text: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="rounded-xl border-2 border-dashed bg-card/50 p-8 text-center">
      <div className="mb-3 flex justify-center">{icon}</div>
      <p className="text-sm text-muted-foreground mb-3">{text}</p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {cta.label} <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
