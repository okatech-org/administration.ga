"use client";

/**
 * Page d'édition d'une représentation (Super Admin)
 *
 * Pattern : auto-save debounced 1s par section via le package
 * `@workspace/settings-form`. Coordonné par `<SettingsFormProvider>` qui :
 *   - Garde la navigation contre la perte de données (useBlocker + beforeunload)
 *   - Affiche un bandeau pédagogique permanent (SettingsAutoSaveBanner)
 *   - Agrège le statut de save des sections pour un indicateur global
 *   - Propage le mode lecture seule (permissions) à toutes les sections
 *
 * Référence plan : `/Users/okatech/.claude/plans/partitioned-seeking-steele.md`
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  SettingsAutoSaveBanner,
  SettingsFormProvider,
  SettingsReadOnlyBanner,
  SettingsUnsavedGuard,
} from "@workspace/settings-form";
import {
  ArrowLeft,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  Contact2,
  CreditCard,
  Crown,
  FileSignature,
  Globe2,
  Home,
  Info,
  Mail,
  MessagesSquare,
  Palette,
  Phone,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AddressesSection } from "@/components/admin/settings/sections/AddressesSection";
import { BrandingSection } from "@/components/admin/settings/sections/BrandingSection";
import { CalendarSection } from "@/components/admin/settings/sections/CalendarSection";
import { CallSettingsSection } from "@/components/admin/settings/sections/CallSettingsSection";
import { ChatsSection } from "@/components/admin/settings/sections/ChatsSection";
import { ContactsSection } from "@/components/admin/settings/sections/ContactsSection";
import { CorrespondanceSection } from "@/components/admin/settings/sections/CorrespondanceSection";
import { IAstedSection } from "@/components/admin/settings/sections/IAstedSection";
import { IboiteSection } from "@/components/admin/settings/sections/IboiteSection";
import { IdentitySection } from "@/components/admin/settings/sections/IdentitySection";
import { JurisdictionSection } from "@/components/admin/settings/sections/JurisdictionSection";
import { NotificationsSection } from "@/components/admin/settings/sections/NotificationsSection";
import { ProtocolSection } from "@/components/admin/settings/sections/ProtocolSection";
import { ServicesPricingSection } from "@/components/admin/settings/sections/ServicesPricingSection";
import {
  SettingsTabsLayout,
  type SettingsTabGroup,
} from "@/components/admin/settings/SettingsTabsLayout";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanDoTask } from "@/hooks/useCanDoTask";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

export const Route = createFileRoute("/_app/reps/$orgId_/edit")({
  component: EditOrganizationPageWrapper,
});

function EditOrganizationPageWrapper() {
  const { orgId } = Route.useParams();
  // Force recréation du composant quand l'orgId change
  return <EditOrganizationPage key={orgId} orgId={orgId as Id<"orgs">} />;
}

interface EditOrganizationPageProps {
  orgId: Id<"orgs">;
}

function EditOrganizationPage({ orgId }: EditOrganizationPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: org, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  // Vérification permission `settings.manage` — si absente, mode lecture seule.
  const { canDo, isReady: permsReady } = useCanDoTask(orgId);
  const canManage = permsReady ? canDo("settings.manage") : true; // optimiste pendant chargement

  // Groupes d'onglets paramétrage
  const groups: SettingsTabGroup[] = [
    // ─── Phase 1 : Identité & Localisation ─────────────────
    {
      title: "Identité & Localisation",
      description: "Informations de base et territorialité",
      tabs: [
        {
          key: "identity",
          label: "Identité",
          icon: Info,
          component: IdentitySection,
          description: "Nom officiel, statut, accréditation",
          accent: "oklch(0.55 0.15 255)",
        },
        {
          key: "protocol",
          label: "Protocole",
          icon: Crown,
          component: ProtocolSection,
          description: "Chef de poste, grade, credentials",
          accent: "oklch(0.65 0.15 50)",
        },
        {
          key: "addresses",
          label: "Adresses",
          icon: Home,
          component: AddressesSection,
          description: "Physique, postale, correspondance",
          accent: "oklch(0.6 0.15 240)",
        },
        {
          key: "jurisdiction",
          label: "Juridiction",
          icon: Globe2,
          component: JurisdictionSection,
          description: "Pays primaire, secondaire, sous-juridictions",
          accent: "oklch(0.6 0.15 145)",
        },
        {
          key: "calendar",
          label: "Horaires & Calendrier",
          icon: CalendarDays,
          component: CalendarSection,
          description: "Horaires, jours fériés, fermetures",
          accent: "oklch(0.6 0.15 30)",
        },
      ],
    },
    // ─── Phase 2 : Communication ──────────────────────────
    {
      title: "Communication",
      description: "Canaux internes et notifications",
      tabs: [
        {
          key: "calls",
          label: "iAppel (paramètres)",
          icon: Phone,
          component: CallSettingsSection,
          description: "Timeouts, recording, fallback",
          accent: "oklch(0.6 0.15 200)",
        },
        {
          key: "iboite",
          label: "iBoîte",
          icon: Mail,
          component: IboiteSection,
          description: "Tampons, signatures, templates",
          accent: "oklch(0.6 0.15 290)",
        },
        {
          key: "correspondance",
          label: "iCorrespondance",
          icon: FileSignature,
          component: CorrespondanceSection,
          description: "Référence, types, signature",
          accent: "oklch(0.55 0.18 320)",
        },
        {
          key: "notifications",
          label: "Notifications",
          icon: Bell,
          component: NotificationsSection,
          description: "Canaux × events, quiet hours",
          accent: "oklch(0.65 0.15 90)",
        },
        {
          key: "chats",
          label: "Chats P2P",
          icon: MessagesSquare,
          component: ChatsSection,
          description: "Routage standard, pièces jointes",
          accent: "oklch(0.6 0.15 180)",
        },
        {
          key: "contacts",
          label: "Contacts & Annuaire",
          icon: Contact2,
          component: ContactsSection,
          description: "Visibilité publique des membres",
          accent: "oklch(0.55 0.18 10)",
        },
      ],
    },
    // ─── Phase 3 : iAsted (chatbot par org) ────────────────
    {
      title: "iAsted",
      description: "Assistant IA contextualisé",
      tabs: [
        {
          key: "iasted",
          label: "Configuration iAsted",
          icon: Bot,
          component: IAstedSection,
          description: "Persona, tools, langues, escalation",
          accent: "oklch(0.55 0.2 270)",
        },
      ],
    },
    // ─── Phase 3 : Opérations (services & branding) ────────
    {
      title: "Opérations",
      description: "Services, tarification et image publique",
      tabs: [
        {
          key: "services",
          label: "Services & Tarification",
          icon: CreditCard,
          component: ServicesPricingSection,
          description: "Pricing Stripe EUR/USD, SLA",
          accent: "oklch(0.6 0.15 145)",
        },
        {
          key: "branding",
          label: "Branding & Page publique",
          icon: Palette,
          component: BrandingSection,
          description: "Couleurs, description, réseaux sociaux",
          accent: "oklch(0.6 0.18 320)",
        },
      ],
    },
  ];

  if (isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <FlatCard>
          <div className="p-3 lg:p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </FlatCard>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/reps" })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("superadmin.common.back")}
        </Button>
        <div className="text-destructive">{t("errors.orgs.notFound")}</div>
      </div>
    );
  }

  return (
    <SettingsFormProvider readOnly={!canManage}>
      <div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
        <PageHeader
          icon={<Building2 className="h-5 w-5" />}
          title={t("superadmin.organizations.form.edit")}
          subtitle={org.name}
          showBackButton
          onBack={() => navigate({ to: `/reps/${orgId}` })}
        />

        {/* Bandeau contextuel : lecture seule OU auto-save pédagogique */}
        {!canManage ? (
          <SettingsReadOnlyBanner missingPermission="settings.manage" />
        ) : (
          <SettingsAutoSaveBanner />
        )}

        <SettingsTabsLayout orgId={orgId} groups={groups} />

        {/* Garde de navigation contre la perte de modifs en cours */}
        <SettingsUnsavedGuard />
      </div>
    </SettingsFormProvider>
  );
}
