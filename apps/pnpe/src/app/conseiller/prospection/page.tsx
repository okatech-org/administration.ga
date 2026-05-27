/**
 * Page Prospection — leads entreprises à démarcher / relancer.
 *
 * MVP basé sur les employeurs déjà inscrits mais non vérifiés (NON_VERIFIE
 * et EN_COURS) — ce sont les contacts à relancer en priorité pour
 * compléter leur dossier et débloquer la publication d'offres.
 *
 * Itération future : table dédiée `prospects` pour les entreprises non
 * encore inscrites, avec pipeline (à contacter / contactée / RDV pris /
 * convertie / abandon).
 */
"use client";

import { useQuery } from "convex/react";
import {
  Building2,
  Clock,
  Filter,
  Mail,
  MessageCircle,
  Phone,
  PhoneCall,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import {
  FlatCard,
  PageHeader,
  SectionHeader,
} from "@workspace/agent-features/components/my-space";

type Employeur = {
  _id: string;
  raisonSociale: string;
  nif: string;
  secteurActivite?: string;
  tailleEntreprise?: string;
  effectif?: number;
  representantLegal?: {
    nom?: string;
    prenoms?: string;
    email?: string;
    telephone?: string;
  };
  adresseSiege?: { city?: string };
  _creationTime: number;
};

export default function ProspectionPage() {
  const nonVerifies = useQuery(api.functions.pnpe.employeurs.listByStatut, {
    statut: "NON_VERIFIE",
  }) as Employeur[] | undefined;
  const enCours = useQuery(api.functions.pnpe.employeurs.listByStatut, {
    statut: "EN_COURS",
  }) as Employeur[] | undefined;

  const aRelancer = (nonVerifies ?? []).slice().sort(
    (a, b) => a._creationTime - b._creationTime,
  );
  const aSuivre = (enCours ?? []).slice().sort(
    (a, b) => a._creationTime - b._creationTime,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Prospection"
        subtitle="Entreprises à démarcher pour compléter leur dossier ou publier des offres"
        icon={<PhoneCall className="size-4" />}
      />

      {/* KPIs pipeline */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <PipelineKpi
          label="À relancer"
          value={nonVerifies?.length ?? "…"}
          description="Entreprises inscrites mais dossier vide"
          icon={Building2}
          tone="bg-amber-500/10 text-amber-600"
        />
        <PipelineKpi
          label="En cours"
          value={enCours?.length ?? "…"}
          description="Dossiers soumis, vérification en attente"
          icon={Clock}
          tone="bg-blue-500/10 text-blue-600"
        />
        <PipelineKpi
          label="Total pipeline"
          value={
            nonVerifies !== undefined && enCours !== undefined
              ? nonVerifies.length + enCours.length
              : "…"
          }
          description="Opportunités actives à convertir"
          icon={Filter}
          tone="bg-foreground/8 dark:bg-foreground/5 text-foreground/70"
        />
      </div>

      {/* À relancer */}
      <ProspectsSection
        title="À relancer (dossier vide)"
        description="Inscrits sans soumettre de pièces vérifiables. Action : WhatsApp/téléphone pour les inviter à compléter."
        icon={<Building2 />}
        prospects={aRelancer}
        loading={nonVerifies === undefined}
        emptyMessage="Aucun employeur à relancer."
      />

      {/* En cours */}
      <ProspectsSection
        title="En cours de vérification"
        description="Dossiers soumis en attente de validation DGI/CNSS. Action : suivre puis valider depuis Portefeuille employeurs."
        icon={<Clock />}
        prospects={aSuivre}
        loading={enCours === undefined}
        emptyMessage="Aucun dossier en cours."
      />
    </div>
  );
}

function PipelineKpi({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <FlatCard className="p-5">
      <div
        className={`size-9 rounded-md flex items-center justify-center ${tone}`}
      >
        <Icon className="size-4.5" />
      </div>
      <div className="mt-3 text-2xl font-display font-bold tabular-nums">
        {value}
      </div>
      <div className="text-sm text-foreground/80 mt-0.5">{label}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{description}</div>
    </FlatCard>
  );
}

function ProspectsSection({
  title,
  description,
  icon,
  prospects,
  loading,
  emptyMessage,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  prospects: Employeur[];
  loading: boolean;
  emptyMessage: string;
}) {
  return (
    <FlatCard className="p-5">
      <SectionHeader icon={icon} title={title} />
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">{description}</p>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : prospects.length === 0 ? (
        <div className="rounded-lg bg-background p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <ul className="space-y-2">
          {prospects.map((p) => (
            <ProspectRow key={p._id} prospect={p} />
          ))}
        </ul>
      )}
    </FlatCard>
  );
}

function ProspectRow({ prospect }: { prospect: Employeur }) {
  const tel = prospect.representantLegal?.telephone;
  const email = prospect.representantLegal?.email;
  const waNumber = tel?.replace(/\D/g, "");

  return (
    <li className="rounded-lg bg-background p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="font-semibold text-sm truncate">
          {prospect.raisonSociale}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>NIF {prospect.nif}</span>
          {prospect.secteurActivite && <span>{prospect.secteurActivite}</span>}
          {prospect.adresseSiege?.city && (
            <span>{prospect.adresseSiege.city}</span>
          )}
          <span>
            Inscrit{" "}
            {new Date(prospect._creationTime).toLocaleDateString("fr-FR")}
          </span>
        </div>
        {prospect.representantLegal && (
          <div className="text-xs text-muted-foreground mt-1.5">
            {prospect.representantLegal.prenoms} {prospect.representantLegal.nom}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 text-emerald-600 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/15"
          >
            <MessageCircle className="size-3.5" />
            WhatsApp
          </a>
        )}
        {tel && (
          <a
            href={`tel:${tel}`}
            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-foreground/5"
          >
            <Phone className="size-3.5" />
            Appeler
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-foreground/5"
          >
            <Mail className="size-3.5" />
            Mail
          </a>
        )}
      </div>
    </li>
  );
}
