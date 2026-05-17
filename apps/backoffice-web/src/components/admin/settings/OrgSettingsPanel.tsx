"use client";

/**
 * OrgSettingsPanel — Panneau de paramétrage complet d'une représentation.
 *
 * Remplace l'ancien dump JSON read-only de l'onglet "Paramètres" et la page
 * /edit globale par une nav verticale qui regroupe toutes les sections
 * éditables, avec auto-save par section (debounced).
 */

import type { Id } from "@convex/_generated/dataModel";
import { SettingsFormProvider } from "@workspace/settings-form";
import {
  AtSign,
  Bell,
  Building2,
  Calendar,
  Globe2,
  Image as ImageIcon,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ScrollText,
  Sparkles,
  Tag,
} from "lucide-react";

import {
  SettingsTabsLayout,
  type SettingsTabGroup,
} from "./SettingsTabsLayout";
import { AddressesSection } from "./sections/AddressesSection";
import { BrandingSection } from "./sections/BrandingSection";
import { CalendarSection } from "./sections/CalendarSection";
import { CallSettingsSection } from "./sections/CallSettingsSection";
import { ChatsSection } from "./sections/ChatsSection";
import { ContactsSection } from "./sections/ContactsSection";
import { CorrespondanceRedirectSection } from "./sections/CorrespondanceRedirectSection";
import { IAstedSection } from "./sections/IAstedSection";
import { IdentitySection } from "./sections/IdentitySection";
import { JurisdictionSection } from "./sections/JurisdictionSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { ProtocolSection } from "./sections/ProtocolSection";
import { ServicesPricingSection } from "./sections/ServicesPricingSection";

interface OrgSettingsPanelProps {
  orgId: Id<"orgs">;
  /** Désactive l'édition (lecture seule pour les comptes sans permission). */
  readOnly?: boolean;
}

const GROUPS: SettingsTabGroup[] = [
  {
    title: "Identité",
    description: "Informations officielles et image de la représentation.",
    tabs: [
      {
        key: "identity",
        label: "Identité",
        icon: Building2,
        component: IdentitySection,
        completionKey: "identity",
      },
      {
        key: "branding",
        label: "Image & logo",
        icon: ImageIcon,
        component: BrandingSection,
        completionKey: "branding",
      },
      {
        key: "contacts",
        label: "Contacts",
        icon: Phone,
        component: ContactsSection,
        completionKey: "contacts",
      },
      {
        key: "addresses",
        label: "Adresses",
        icon: MapPin,
        component: AddressesSection,
        completionKey: "addresses",
      },
      {
        key: "jurisdiction",
        label: "Juridiction",
        icon: Globe2,
        component: JurisdictionSection,
        completionKey: "jurisdiction",
      },
    ],
  },
  {
    title: "Configuration générale",
    description: "Protocole, horaires, services, notifications.",
    tabs: [
      {
        key: "protocol",
        label: "Protocole",
        icon: ScrollText,
        component: ProtocolSection,
        completionKey: "protocol",
      },
      {
        key: "calendar",
        label: "Calendrier",
        icon: Calendar,
        component: CalendarSection,
        completionKey: "calendar",
      },
      {
        key: "services-pricing",
        label: "Tarifs services",
        icon: Tag,
        component: ServicesPricingSection,
        completionKey: "servicesPricing",
      },
      {
        key: "notifications",
        label: "Notifications",
        icon: Bell,
        component: NotificationsSection,
        completionKey: "notifications",
      },
    ],
  },
  {
    title: "Communication",
    description: "Courrier officiel, appels, messagerie interne.",
    tabs: [
      {
        key: "correspondance",
        label: "iCorrespondance",
        icon: Mail,
        component: CorrespondanceRedirectSection,
      },
      {
        key: "calls",
        label: "Appels",
        icon: AtSign,
        component: CallSettingsSection,
        completionKey: "calls",
      },
      {
        key: "chats",
        label: "Messagerie",
        icon: MessageSquare,
        component: ChatsSection,
        completionKey: "chats",
      },
    ],
  },
  {
    title: "Intelligence artificielle",
    tabs: [
      {
        key: "iasted",
        label: "iAsted",
        icon: Sparkles,
        component: IAstedSection,
        completionKey: "iasted",
      },
    ],
  },
];

export function OrgSettingsPanel({ orgId, readOnly = false }: OrgSettingsPanelProps) {
  return (
    <SettingsFormProvider readOnly={readOnly}>
      <SettingsTabsLayout orgId={orgId} groups={GROUPS} />
    </SettingsFormProvider>
  );
}
