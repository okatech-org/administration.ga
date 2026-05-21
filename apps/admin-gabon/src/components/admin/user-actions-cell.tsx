"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { MoreHorizontal, Shield, UserCheck, UserX, Eye, Trash2, RotateCcw, AlertTriangle, Layers, ShieldAlert } from "lucide-react"
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
import { useConvexMutationQuery } from "@/integrations/convex/hooks"
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
              {isBackOfficeOrAgent && !isSuperAdmin && (
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Suppression définitive
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est <strong>irréversible</strong>. Le compte{" "}
              <strong>{user.email}</strong> ainsi que son profil et ses 
              affiliations seront supprimés de manière permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
