"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { MoreHorizontal, Shield, UserCheck, UserX, Eye, Trash2, RotateCcw, AlertTriangle, Layers, ShieldAlert, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Doc } from "@convex/_generated/dataModel"
import { UserRoleDialog } from "./user-role-dialog"
import { UserModulesDialog } from "./user-modules-dialog"
import { useConvexMutationQuery, useAuthenticatedConvexQuery } from "@/integrations/convex/hooks"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role"

interface UserActionsCellProps {
  user: Doc<"users">
}

export function UserActionsCell({ user }: UserActionsCellProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { canManageUser } = useCurrentAdminRole()
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showModulesDialog, setShowModulesDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const { mutate: enableUser, isPending: isEnabling } = useConvexMutationQuery(
    api.functions.admin.enableUser
  )
  
  const { mutate: disableUser, isPending: isDisabling } = useConvexMutationQuery(
    api.functions.admin.disableUser
  )

  const { mutate: softDeleteUser, isPending: isTrashing } = useConvexMutationQuery(
    api.functions.admin.softDeleteUser
  )

  const { mutate: restoreUser, isPending: isRestoring } = useConvexMutationQuery(
    api.functions.admin.restoreUser
  )

  const { mutate: permanentlyDeleteUser, isPending: isPermanentDeleting } = useConvexMutationQuery(
    api.functions.admin.permanentlyDeleteUser
  )

  const isTrashed = !!(user as any).deletedAt
  const userRole = (user as any).role as string || "user"
  const isSuperAdmin = userRole === "super_admin" || (user as any).isSuperadmin
  const isBackOfficeOrAgent = ["admin", "admin_system", "intel_agent", "education_agent"].includes(userRole)
  const hasMembership = !!(user as any).hasMembership
  const canManageModules = (isBackOfficeOrAgent || hasMembership) && !isSuperAdmin

  // Role-based permission: can the current caller manage this user?
  const canManage = canManageUser(userRole)

  const handleToggleStatus = async () => {
    try {
      if (user.isActive) {
        await disableUser({ userId: user._id })
        toast.success(t("superadmin.users.actions.disable") + " ")
      } else {
        await enableUser({ userId: user._id })
        toast.success(t("superadmin.users.actions.enable") + " ")
      }
    } catch (error) {
      toast.error(t("superadmin.common.error"))
    }
  }

  const handleSoftDelete = async () => {
    try {
      await softDeleteUser({ userId: user._id })
      toast.success("Utilisateur déplacé dans la corbeille ")
    } catch (error) {
      toast.error(t("superadmin.common.error"))
    }
  }

  const handleRestore = async () => {
    try {
      await restoreUser({ userId: user._id })
      toast.success("Utilisateur restauré avec succès ")
    } catch (error) {
      toast.error(t("superadmin.common.error"))
    }
  }

  const handlePermanentDelete = async () => {
    try {
      await permanentlyDeleteUser({ userId: user._id })
      toast.success("Utilisateur supprimé définitivement")
      setShowDeleteDialog(false)
    } catch (error) {
      toast.error(t("superadmin.common.error"))
    }
  }

  const handleView = () => {
    router.push(`/users/${user._id}`)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="flex items-center gap-2">
            {user.email}
            {!canManage && (
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleView} className="cursor-pointer focus:bg-muted focus:text-foreground">
            <Eye className="mr-2 h-4 w-4" />
            {t("superadmin.common.view")}
          </DropdownMenuItem>
          
          {!isTrashed && canManage && (
            <>
              <DropdownMenuItem onClick={() => setShowRoleDialog(true)} className="cursor-pointer focus:bg-muted focus:text-foreground">
                <Shield className="mr-2 h-4 w-4" />
                {t("superadmin.users.actions.editRole")}
              </DropdownMenuItem>
              {canManageModules && (
                <DropdownMenuItem onClick={() => setShowModulesDialog(true)} className="cursor-pointer focus:bg-muted focus:text-foreground">
                  <Layers className="mr-2 h-4 w-4" />
                  Gérer les modules
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={handleToggleStatus}
                disabled={isEnabling || isDisabling}
                className="cursor-pointer focus:bg-muted focus:text-foreground"
              >
                {user.isActive ? (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    {t("superadmin.users.actions.disable")}
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    {t("superadmin.users.actions.enable")}
                  </>
                )}
              </DropdownMenuItem>
            </>
          )}

          {/* Protected user indicator */}
          {!isTrashed && !canManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-xs text-muted-foreground opacity-60">
                <ShieldAlert className="mr-2 h-4 w-4 text-amber-500" />
                Utilisateur protégé
              </DropdownMenuItem>
            </>
          )}
          
          {canManage && (
            <>
              <DropdownMenuSeparator />
              
              {isTrashed ? (
                <>
                  <DropdownMenuItem
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="cursor-pointer text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-500/10"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restaurer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isPermanentDeleting}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-red-50 dark:focus:bg-red-500/10"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Supprimer définitivement
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onClick={handleSoftDelete}
                  disabled={isTrashing}
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-red-50 dark:focus:bg-red-500/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Mettre à la corbeille
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <UserRoleDialog
        user={user}
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
      />

      <UserModulesDialog
        user={user}
        open={showModulesDialog}
        onOpenChange={setShowModulesDialog}
      />

      <DeletionPreviewDialog
        user={user}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handlePermanentDelete}
        isPending={isPermanentDeleting}
      />
    </>
  )
}

// ─── Deletion Preview Dialog ────────────────────────────────

const DELETION_LABELS: Record<string, string> = {
  profile: "Profil",
  childProfiles: "Profils enfants",
  requests: "Demandes",
  documents: "Documents",
  events: "Événements",
  agentNotes: "Notes agents",
  memberships: "Affiliations",
  notifications: "Notifications",
  payments: "Paiements",
  meetings: "Rendez-vous",
  cv: "CV",
  digitalMail: "Courrier numérique",
  deliveryPackages: "Colis",
  associationMembers: "Adhésions associatives",
  associationClaims: "Demandes associatives",
  companyMembers: "Affiliations entreprises",
  conversations: "Conversations",
  callLines: "Lignes d'appel",
  tickets: "Tickets support",
  messages: "Messages",
  pushSubscriptions: "Abonnements push",
  consularRegistrations: "Inscriptions consulaires",
  consularNotifications: "Signalements consulaires",
  printJobs: "Tâches d'impression",
}

function DeletionPreviewDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  user: Doc<"users">
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isPending: boolean
}) {
  const { data: preview } = useAuthenticatedConvexQuery(
    api.functions.admin.getUserDeletionPreview,
    open ? { userId: user._id } : "skip",
  )

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Suppression définitive
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Cette action est <strong className="text-foreground">irréversible</strong>. Le compte{" "}
                <strong className="text-foreground">{user.email}</strong> et toutes ses données
                seront supprimés de manière permanente.
              </p>

              {!preview ? (
                <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse des données…
                </div>
              ) : preview.totalItems === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Aucune donnée associée à supprimer.
                </p>
              ) : (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Données à supprimer ({preview.totalItems} éléments)
                  </p>
                  {Object.entries(preview.counts)
                    .filter(([, count]) => (count as number) > 0)
                    .map(([key, count]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {DELETION_LABELS[key] || key}
                        </span>
                        <span className="font-medium tabular-nums">{count as number}</span>
                      </div>
                    ))}
                  {preview.storageFileCount > 0 && (
                    <div className="flex justify-between text-sm pt-1 border-t mt-1">
                      <span className="text-muted-foreground">Fichiers (storage)</span>
                      <span className="font-medium tabular-nums">{preview.storageFileCount}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending || !preview}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suppression…
              </>
            ) : (
              "Supprimer définitivement"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
