"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Briefcase, FileText, ArrowRight, Lightbulb } from "lucide-react";
import { api } from "@convex/_generated/api";

export default function ParticulierDashboard() {
  // @ts-expect-error api.pnpe type apres codegen
  const overview = useQuery(api.pnpe?.citoyenAccount?.getMyOverview) as
    | {
        user: { name: string; email: string };
        stats: { candidaturesCount: number; annoncesCount: number };
      }
    | undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Espace Particulier
        </h1>
        <p className="text-muted-foreground mt-1">
          {overview?.user.name
            ? `Bonjour ${overview.user.name.split(" ")[0]} —`
            : ""}{" "}
          gerez vos annonces publiees comme particulier.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={<Briefcase className="size-5" />}
          label="Mes annonces"
          value={overview?.stats.annoncesCount ?? 0}
          href="/particulier/annonces"
        />
        <StatCard
          icon={<FileText className="size-5" />}
          label="Mes candidatures envoyees"
          value={overview?.stats.candidaturesCount ?? 0}
          href="https://travail.ga/mon-compte/candidatures"
          external
        />
      </div>

      <aside className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6">
        <div className="flex items-start gap-3">
          <Lightbulb className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">
              Vous etes employeur regulier ?
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Si vous publiez plusieurs annonces par an ou avez une activite
              salariee declaree, inscrivez votre entreprise pour beneficier de
              la file employeur PNPE et de la verification DGI/CNSS.
            </p>
            <Link
              href="/employeur/inscription"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Devenir employeur PNPE <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  external?: boolean;
}) {
  const Wrapper = external ? "a" : Link;
  return (
    <Wrapper
      // @ts-expect-error union
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="group rounded-2xl border bg-card p-5 hover:border-primary/40 transition-colors flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-2xl font-bold tabular-nums mt-0.5">{value}</div>
        </div>
      </div>
      <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
    </Wrapper>
  );
}
