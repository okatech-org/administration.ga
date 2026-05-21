"use client";

/**
 * TeamListView — Vue liste unifiée des membres avec leur poste
 *
 * Améliorations vs ancienne OrgMembersTable :
 *   - Colonne « Poste » avec badge cliquable
 *   - Colonne « Modules » (résumé des permissions)
 *   - Action « Édit » → modale de réassignation rapide
 *   - Action « Supprimer » avec confirmation
 *   - Bouton « Ajouter membre » → ouvre AddMemberDialog existant
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Edit, MoreHorizontal, Search, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AddMemberDialog } from "@/components/org/add-member-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { AssignMemberToPositionDialog } from "./AssignMemberToPositionDialog";

export interface TeamListViewProps {
  orgId: Id<"orgs">;
}

function getInitials(
  firstName?: string,
  lastName?: string,
  email?: string,
): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

interface MemberRow {
  membershipId: Id<"memberships">;
  userId: Id<"users">;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  positionId?: Id<"positions">;
  positionTitle?: { fr?: string; en?: string };
  positionGrade?: string;
  isPublicContact?: boolean;
  joinedAt: number;
}

export function TeamListView({ orgId }: TeamListViewProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [memberToReassign, setMemberToReassign] = useState<MemberRow | null>(
    null,
  );
  const [memberToRemove, setMemberToRemove] = useState<MemberRow | null>(null);

  const { data: members, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getMembers,
    { orgId },
  );

  const { mutate: removeMember, isPending: isRemoving } =
    useConvexMutationQuery(api.functions.orgs.removeMember);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const q = search.trim().toLowerCase();
    const list = members as unknown as MemberRow[];
    if (!q) return list;
    return list.filter((m) => {
      const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`
        .toLowerCase()
        .trim();
      const title = m.positionTitle?.[lang as "fr" | "en"] ?? "";
      return (
        name.includes(q) ||
        (m.email ?? "").toLowerCase().includes(q) ||
        title.toLowerCase().includes(q)
      );
    });
  }, [members, search, lang]);

  const handleRemove = async () => {
    if (!memberToRemove) return;
    try {
      await removeMember({ orgId, userId: memberToRemove.userId });
      toast.success("Membre retiré de la représentation");
      setMemberToRemove(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <FlatCard>
      <div className="p-3 lg:p-4">
        {/* En-tête + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold">Membres de l'équipe</h3>
            <p className="text-xs text-muted-foreground">
              {members?.length ?? 0} membre{(members?.length ?? 0) > 1 ? "s" : ""}{" "}
              actif{(members?.length ?? 0) > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="pl-7 h-8 text-xs w-48"
              />
            </div>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter un membre
            </Button>
          </div>
        </div>

        {/* Table */}
        {isPending ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {search
              ? "Aucun membre ne correspond à la recherche"
              : "Aucun membre dans cette représentation"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((m) => {
                const name =
                  `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() ||
                  m.email ||
                  "—";
                const positionLabel =
                  m.positionTitle?.[lang as "fr" | "en"] ??
                  m.positionTitle?.fr ??
                  null;
                return (
                  <TableRow key={m.membershipId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={m.avatarUrl} alt={name} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(m.firstName, m.lastName, m.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {positionLabel ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] cursor-pointer hover:bg-secondary/80"
                          onClick={() => setMemberToReassign(m)}
                        >
                          {positionLabel}
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMemberToReassign(m)}
                          className="h-6 px-2 text-[10px] text-amber-600"
                        >
                          + Affecter un poste
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.email}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setMemberToReassign(m)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-2" />
                            Réassigner le poste
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setMemberToRemove(m)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Retirer de l'org
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modale ajout membre */}
      <AddMemberDialog
        orgId={orgId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {/* Modale réassignation poste */}
      <AssignMemberToPositionDialog
        orgId={orgId}
        membershipId={memberToReassign?.membershipId ?? null}
        memberName={
          memberToReassign
            ? `${memberToReassign.firstName ?? ""} ${memberToReassign.lastName ?? ""}`.trim() ||
              memberToReassign.email ||
              "—"
            : ""
        }
        currentPositionId={memberToReassign?.positionId ?? null}
        onClose={() => setMemberToReassign(null)}
      />

      {/* Confirmation suppression */}
      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => { if (!open) setMemberToRemove(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le membre perdra l'accès à cette représentation et son poste sera
              libéré. Cette action peut être annulée en le rajoutant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? "Suppression…" : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FlatCard>
  );
}
