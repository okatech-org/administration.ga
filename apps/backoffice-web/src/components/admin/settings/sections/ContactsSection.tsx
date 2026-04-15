"use client";

/**
 * ContactsSection — Annuaire public et gestion des contacts par représentation
 *
 * Couverture :
 *   - Liste des membres avec toggle inline "Contact public" (isPublicContact)
 *   - Affichage des champs visibles (email/téléphone) par membre
 *   - Ordre d'affichage dans l'annuaire (futur : drag-reorder)
 *   - Groupes de contacts (futur : VIPs, diaspora, partenaires)
 *
 * NOTE : Cette section s'appuie sur `memberships.isPublicContact` existant.
 * Les fonctions granulaires d'édition seront étendues dans une prochaine passe.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSettingsFormOptional } from "@workspace/settings-form";
import { AtSign, Eye, EyeOff, UserCircle, Users2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import type { SettingsSectionProps } from "../SettingsTabsLayout";

export function ContactsSection({ orgId, onStatusChange }: SettingsSectionProps) {
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: members, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.listOrgDiplomaticMembers,
    { orgId },
  );

  // NOTE : mutation pour toggle isPublicContact — on utilise la mutation existante
  // `admin.updateMembership` ou équivalent. Pour l'instant on utilise update générique.
  const { mutateAsync: updateMembership } = useConvexMutationQuery(
    api.functions.admin.updateMembershipContactVisibility,
  );

  const [search, setSearch] = useState("");

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = `${m.user?.firstName ?? ""} ${m.user?.lastName ?? ""}`
        .toLowerCase()
        .trim();
      const title = (m.position?.title as Record<string, string> | undefined)?.fr ?? "";
      return (
        name.includes(q) ||
        (m.user?.email ?? "").toLowerCase().includes(q) ||
        title.toLowerCase().includes(q)
      );
    });
  }, [members, search]);

  const publicCount = useMemo(
    () => (members ?? []).filter((m) => m.isPublicContact).length,
    [members],
  );

  const togglePublic = async (
    membershipId: Id<"memberships">,
    isPublic: boolean,
  ) => {
    if (readOnly) return; // défense en profondeur : pas de mutation en lecture seule
    onStatusChange?.("saving");
    ctx?.notifySectionStatus("contacts", "saving");
    try {
      await updateMembership({
        membershipId,
        isPublicContact: isPublic,
      });
      onStatusChange?.("saved");
      ctx?.notifySectionStatus("contacts", "saved");
      setTimeout(() => {
        onStatusChange?.("idle");
        ctx?.notifySectionStatus("contacts", "idle");
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      onStatusChange?.("error", msg);
      ctx?.notifySectionStatus("contacts", "error", msg);
    }
  };

  if (isPending) return <ContactsSkeleton />;
  if (!members) return null;

  return (
    <div className="space-y-4">
      {/* ─── Résumé ────────────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Users2 className="h-4 w-4 text-emerald-600" />}
            title="Annuaire public"
          />
          <p className="text-xs text-muted-foreground mb-3">
            Membres visibles par les citoyens dans l'annuaire de la
            représentation. Les citoyens voient uniquement les membres marqués
            comme "Contact public".
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                <Eye className="h-3 w-3 mr-1" />
                {publicCount} public{publicCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <EyeOff className="h-3 w-3 mr-1" />
                {members.length - publicCount} interne
                {members.length - publicCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {members.length} membre{members.length !== 1 ? "s" : ""} au total
            </div>
          </div>
        </div>
      </FlatCard>

      {/* ─── Liste membres ─────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <SectionHeader
              icon={<UserCircle className="h-4 w-4 text-blue-600" />}
              title="Visibilité des membres"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un membre…"
              className="max-w-xs"
            />
          </div>

          {filteredMembers.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              {search
                ? "Aucun membre ne correspond à la recherche"
                : "Aucun membre dans cette représentation"}
            </p>
          ) : (
            <ul className="space-y-1">
              {filteredMembers.map((m) => {
                const name =
                  `${m.user?.firstName ?? ""} ${m.user?.lastName ?? ""}`.trim() ||
                  m.user?.email ||
                  "Sans nom";
                const title = (m.position?.title as Record<string, string> | undefined)
                  ?.fr;
                return (
                  <li
                    key={m.membershipId}
                    className={cn(
                      "flex items-center gap-3 py-2 px-2 rounded-md transition-colors",
                      m.isPublicContact ? "bg-emerald-500/5" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{name}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {title && <span className="truncate">{title}</span>}
                        {m.user?.email && (
                          <span className="flex items-center gap-1 truncate">
                            <AtSign className="h-3 w-3" />
                            {m.user.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {m.isPublicContact && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-700 text-[9px]"
                        >
                          <Eye className="h-2.5 w-2.5 mr-1" />
                          Public
                        </Badge>
                      )}
                      <Switch
                        checked={m.isPublicContact ?? false}
                        onCheckedChange={(v) =>
                          togglePublic(m.membershipId as Id<"memberships">, v)
                        }
                        aria-label={`Rendre ${name} public`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </FlatCard>

      {/* ─── Groupes (placeholder Phase 3) ─────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Users2 className="h-4 w-4 text-purple-600" />}
            title="Groupes de contacts"
          />
          <p className="text-xs text-muted-foreground">
            Catégorisation avancée (VIPs, diaspora, partenaires, associations)
            avec règles d'auto-adhésion. Disponible en Phase 3.
          </p>
        </div>
      </FlatCard>
    </div>
  );
}

function ContactsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-10 w-full" />
            ))}
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
