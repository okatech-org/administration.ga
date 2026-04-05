import {
  Calendar,
  MessageSquare,
  Phone,
  Settings,
  Trash2,
  UserCheck,
  UserCog,
  UserX,
} from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Roles disponibles ───────────────────────────────────────
const PLATFORM_ROLES = [
  { value: "citizen", label: "Citoyen" },
  { value: "agent", label: "Agent consulaire" },
  { value: "admin", label: "Administrateur" },
  { value: "super_admin", label: "Super Admin" },
];

// ─── Props ────────────────────────────────────────────────────
export interface ProfileActionsCardProps {
  context: "admin" | "agent";
  user: any;
  profileId: string;
  canManageUser?: boolean;
  onChangeRole?: (newRole: string) => void;
  onDisableAccount?: () => void;
  onDeleteAccount?: () => void;
  onAssignRequests?: () => void;
  onRequestAction?: () => void;
  onCallCitizen?: () => void;
  onScheduleAppointment?: () => void;
}

/**
 * Panneau d'actions contextuelles (admin ou agent).
 * Actions destructives protegees par des boites de confirmation.
 */
export function ProfileActionsCard({
  context,
  user,
  profileId: _profileId,
  canManageUser = false,
  onChangeRole,
  onDisableAccount,
  onDeleteAccount,
  onAssignRequests,
  onRequestAction,
  onCallCitizen,
  onScheduleAppointment,
}: ProfileActionsCardProps) {
  const [selectedRole, setSelectedRole] = useState(user?.role ?? "citizen");

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <Settings className="w-3.5 h-3.5 text-purple-500" />
          </div>
          Actions
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 pt-1 space-y-2">
        {/* === Actions Admin === */}
        {context === "admin" && (
          <>
            {/* Changement de role */}
            {canManageUser && (
              <div className="space-y-1.5">
                <ActionItem
                  icon={UserCog}
                  label="Changer le role"
                  description="Modifier le niveau d'acces de ce compte"
                  color="text-purple-500"
                />
                <div className="flex items-center gap-2 pl-8">
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => {
                      setSelectedRole(value);
                      onChangeRole?.(value);
                    }}
                  >
                    <SelectTrigger className="h-7 text-[11px] flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value} className="text-[12px]">
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Separator className="my-2" />

            {/* Desactiver le compte */}
            {canManageUser && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button type="button" className="w-full text-left">
                    <ActionItem
                      icon={UserX}
                      label="Desactiver le compte"
                      description="Empecher l'acces a la plateforme"
                      color="text-amber-500"
                      hoverable
                    />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desactiver ce compte ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      L'utilisateur ne pourra plus se connecter ni acceder a ses demandes.
                      Cette action est reversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDisableAccount}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Desactiver
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Supprimer le compte */}
            {canManageUser && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button type="button" className="w-full text-left">
                    <ActionItem
                      icon={Trash2}
                      label="Supprimer le compte"
                      description="Supprimer definitivement ce compte et ses donnees"
                      color="text-red-500"
                      hoverable
                      destructive
                    />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irreversible. Toutes les donnees de ce profil
                      seront definitivement supprimees.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Supprimer definitivement
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}

        {/* === Actions Agent === */}
        {context === "agent" && (
          <>
            <button type="button" className="w-full text-left" onClick={onAssignRequests}>
              <ActionItem
                icon={UserCheck}
                label="Assigner les demandes"
                description="Prendre en charge les demandes de ce citoyen"
                color="text-teal-600 dark:text-teal-400"
                hoverable
              />
            </button>

            <button type="button" className="w-full text-left" onClick={onRequestAction}>
              <ActionItem
                icon={MessageSquare}
                label="Demander une action"
                description="Envoyer une notification au citoyen"
                color="text-blue-500"
                hoverable
              />
            </button>

            <button type="button" className="w-full text-left" onClick={onCallCitizen}>
              <ActionItem
                icon={Phone}
                label="Appeler le citoyen"
                description="Demarrer un appel telephonique"
                color="text-green-500"
                hoverable
              />
            </button>

            <button type="button" className="w-full text-left" onClick={onScheduleAppointment}>
              <ActionItem
                icon={Calendar}
                label="Planifier un RDV"
                description="Creer un rendez-vous consulaire"
                color="text-amber-500"
                hoverable
              />
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sous-composant : ligne d'action ──────────────────────────
function ActionItem({
  icon: Icon,
  label,
  description,
  color,
  hoverable = false,
  destructive = false,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  hoverable?: boolean;
  destructive?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 p-2 rounded-lg transition-colors",
        hoverable && "hover:bg-muted/50 cursor-pointer",
        destructive && "hover:bg-red-500/5",
      )}
    >
      <div className={cn("p-1 rounded-md shrink-0 mt-0.5", destructive ? "bg-red-500/10" : "bg-muted")}>
        <Icon className={cn("h-3.5 w-3.5", color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[12px] font-semibold", destructive && "text-red-600 dark:text-red-400")}>
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{description}</p>
      </div>
    </div>
  );
}
