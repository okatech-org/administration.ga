"use client";

/**
 * CommandPalette — Recherche unifiée Cmd+K (Phase C2)
 *
 * Index searchable :
 *   - Toutes les sections de paramétrage (/reps/{orgId}/edit) avec leurs labels
 *   - Liste des représentations (navigation rapide)
 *   - Actions courantes (créer une rep, voir mes paramètres)
 *
 * Trigger : ⌘K (Mac) / Ctrl+K (Windows)
 *
 * À placer dans le layout principal de l'app pour être disponible partout.
 */

import { api } from "@convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import {
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
  MessagesSquare,
  Palette,
  Phone,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

interface SettingsSectionItem {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  zone: "Identité & Localisation" | "Communication" | "iAsted" | "Opérations";
}

const SETTINGS_SECTIONS: SettingsSectionItem[] = [
  // Identité & Localisation
  { key: "identity", label: "Identité", icon: Info, description: "Nom officiel, statut, accréditation", zone: "Identité & Localisation" },
  { key: "protocol", label: "Protocole", icon: Crown, description: "Chef de poste, grade, credentials", zone: "Identité & Localisation" },
  { key: "addresses", label: "Adresses", icon: Home, description: "Physique, postale, correspondance", zone: "Identité & Localisation" },
  { key: "jurisdiction", label: "Juridiction", icon: Globe2, description: "Pays primaire, secondaire", zone: "Identité & Localisation" },
  { key: "calendar", label: "Horaires & Calendrier", icon: CalendarDays, description: "Horaires, jours fériés, fermetures", zone: "Identité & Localisation" },
  // Communication
  { key: "calls", label: "iAppel (paramètres)", icon: Phone, description: "Timeouts, recording, fallback", zone: "Communication" },
  { key: "correspondance", label: "iCorrespondance", icon: FileSignature, description: "Référence, types, signature", zone: "Communication" },
  { key: "notifications", label: "Notifications", icon: Bell, description: "Canaux × events, quiet hours", zone: "Communication" },
  { key: "chats", label: "Chats P2P", icon: MessagesSquare, description: "Routage, pièces jointes", zone: "Communication" },
  { key: "contacts", label: "Contacts & Annuaire", icon: Contact2, description: "Visibilité publique des membres", zone: "Communication" },
  // iAsted
  { key: "iasted", label: "Configuration iAsted", icon: Bot, description: "Persona, tools, langues, escalation", zone: "iAsted" },
  // Opérations
  { key: "services", label: "Services & Tarification", icon: CreditCard, description: "Tarification, SLA", zone: "Opérations" },
  { key: "branding", label: "Branding & Page publique", icon: Palette, description: "Couleurs, description, réseaux sociaux", zone: "Opérations" },
];

export interface CommandPaletteProps {
  /** Org ID actuelle (si on est dans une page rep) — permet routing direct vers /edit */
  currentOrgId?: string;
}

export function CommandPalette({ currentOrgId }: CommandPaletteProps = {}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: orgs } = useAuthenticatedConvexQuery(
    api.functions.orgs.list,
    open ? {} : "skip",
  );

  // Raccourci ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navigateToSection = (sectionKey: string) => {
    setOpen(false);
    if (currentOrgId) {
      navigate({
        to: "/reps/$orgId/edit",
        params: { orgId: currentOrgId },
        hash: sectionKey,
      });
    } else {
      navigate({ to: "/reps" });
    }
  };

  const navigateToOrg = (orgId: string) => {
    setOpen(false);
    navigate({ to: "/reps/$orgId", params: { orgId } });
  };

  // Groupes de sections par zone
  const sectionsByZone = SETTINGS_SECTIONS.reduce<
    Record<string, SettingsSectionItem[]>
  >((acc, s) => {
    if (!acc[s.zone]) acc[s.zone] = [];
    acc[s.zone].push(s);
    return acc;
  }, {});

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs gap-1.5"
      >
        <Search className="h-3 w-3" />
        Rechercher
        <kbd className="ml-1.5 hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher un paramètre, une représentation…" />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

          {/* Actions rapides */}
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                navigate({ to: "/reps/new" });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer une nouvelle représentation
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setOpen(false);
                navigate({ to: "/reps" });
              }}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Voir toutes les représentations
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Sections paramétrage par zone */}
          {Object.entries(sectionsByZone).map(([zone, sections]) => (
            <CommandGroup key={zone} heading={`Paramètres : ${zone}`}>
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <CommandItem
                    key={section.key}
                    value={`${section.label} ${section.description} ${section.key}`}
                    onSelect={() => navigateToSection(section.key)}
                  >
                    <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div className="flex flex-col flex-1">
                      <span>{section.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {section.description}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}

          {/* Représentations */}
          {orgs && orgs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Représentations">
                {orgs.slice(0, 10).map((org) => (
                  <CommandItem
                    key={org._id}
                    value={`${org.name} ${org.slug ?? ""} ${org.country ?? ""}`}
                    onSelect={() => navigateToOrg(org._id)}
                  >
                    <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div className="flex flex-col flex-1">
                      <span>{org.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {org.type} · {org.country}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Astuce">
            <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
              <Settings className="h-3 w-3 inline mr-1" />
              Ouvre cette palette à tout moment avec <kbd className="px-1 bg-muted rounded">⌘K</kbd>
            </div>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
