/**
 * Page Rendez-vous — point d'entrée agenda du conseiller.
 *
 * L'agenda complet (vue jour / semaine / mois, création d'événements,
 * intégration LiveKit pour les visios) vit dans le module générique
 * iAgenda (`/iagenda`) du shell OkaTech. Cette page sert de hub
 * contextualisé pour les conseillers PNPE avec actions rapides typées
 * "métier emploi" (entretien D.E, entretien employeur).
 */
"use client";

import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  PhoneCall,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
import {
  FlatCard,
  PageHeader,
  SectionHeader,
} from "@workspace/agent-features/components/my-space";

export default function RendezVousPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes rendez-vous"
        subtitle="Agenda du conseiller PNPE — entretiens D.E et employeurs"
        icon={<CalendarDays className="size-4" />}
        actions={
          <Link
            href="/iagenda"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <CalendarDays className="size-4" />
            Ouvrir iAgenda
          </Link>
        }
      />

      <FlatCard className="p-5">
        <SectionHeader icon={<PhoneCall />} title="Nouveau rendez-vous" />
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Choisissez le type d'entretien pour démarrer une convocation
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <RdvTypeCard
            icon={UserCheck}
            tone="bg-blue-500/10 text-blue-600"
            title="Entretien D.E"
            description="Bilan de compétences, validation profil, suivi placement"
            href="/iagenda?type=entretien-de"
          />
          <RdvTypeCard
            icon={Briefcase}
            tone="bg-emerald-500/10 text-emerald-600"
            title="Entretien employeur"
            description="Présentation poste, étude besoin, accompagnement RH"
            href="/iagenda?type=entretien-employeur"
          />
          <RdvTypeCard
            icon={Video}
            tone="bg-amber-500/10 text-amber-600"
            title="Visio LiveKit"
            description="RDV à distance avec D.E ou candidat (lien généré auto)"
            href="/iagenda?type=visio"
          />
        </div>
      </FlatCard>

      <FlatCard className="p-5">
        <SectionHeader icon={<CalendarDays />} title="Agenda complet" />
        <div className="mt-4 rounded-lg bg-background p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium">
              Toutes les fonctionnalités d'agenda sont dans iAgenda
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Vue jour / semaine / mois, création d'événements, invitations
              email, intégration LiveKit, rappels.
            </p>
          </div>
          <Link
            href="/iagenda"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground/80 hover:bg-foreground/5 transition-colors"
          >
            Aller à iAgenda
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </FlatCard>

      <FlatCard className="p-5">
        <SectionHeader icon={<Users />} title="Pour aller plus loin" />
        <ul className="mt-4 space-y-2 text-sm">
          <ShortcutLi
            href="/conseiller/file-d-attente"
            label="File d'attente"
            description="D.E à valider — convocable directement après contact"
          />
          <ShortcutLi
            href="/conseiller/mes-demandeurs"
            label="Mes demandeurs"
            description="Portefeuille D.E — voir profil avant RDV"
          />
          <ShortcutLi
            href="/conseiller/employeurs"
            label="Portefeuille employeurs"
            description="Relancer une entreprise pour un entretien"
          />
        </ul>
      </FlatCard>
    </div>
  );
}

function RdvTypeCard({
  icon: Icon,
  tone,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg bg-background p-4 hover:bg-primary/5 transition-colors"
    >
      <div
        className={`size-9 rounded-md flex items-center justify-center ${tone}`}
      >
        <Icon className="size-4.5" />
      </div>
      <div className="mt-3 font-medium text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
      <div className="mt-3 text-xs font-medium text-primary inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Planifier <ArrowRight className="size-3" />
      </div>
    </Link>
  );
}

function ShortcutLi({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between gap-4 rounded-lg bg-background px-3 py-2.5 hover:bg-primary/5 transition-colors"
      >
        <div className="min-w-0">
          <div className="font-medium text-sm">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {description}
          </div>
        </div>
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </Link>
    </li>
  );
}
