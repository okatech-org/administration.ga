"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  MoreHorizontal,
  Eye,
  Edit,
  Users,
  FileText,
  Power,
  PowerOff,
  Trash2,
  RotateCcw,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Doc } from "@convex/_generated/dataModel"
import { useConvexMutationQuery } from "@/integrations/convex/hooks"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import Link from "next/link"
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role"
import { DeleteOrgDialog } from "./delete-org-dialog"
import { PurgeOrgDialog } from "./purge-org-dialog"

interface OrgActionsCellProps {
  org: Doc<"orgs">
}

export function OrgActionsCell({ org }: OrgActionsCellProps) {
  const { t } = useTranslation()
  const { isSuperAdmin } = useCurrentAdminRole()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPurgeDialog, setShowPurgeDialog] = useState(false)

  const { mutate: disableOrg, isPending: isDisabling } = useConvexMutationQuery(
    api.functions.admin.disableOrg
  )

  const { mutate: enableOrg, isPending: isEnabling } = useConvexMutationQuery(
    api.functions.admin.enableOrg
  )

  const { mutate: restoreOrg, isPending: isRestoring } = useConvexMutationQuery(
    api.functions.admin.restoreOrg
  )

  const isTrashed = !!org.deletedAt

  const handleToggleStatus = async () => {
    try {
      if (org.isActive) {
        await disableOrg({ orgId: org._id })
        toast.success(t("superadmin.organizations.actions.disable") + " ")
      } else {
        await enableOrg({ orgId: org._id })
        toast.success(t("superadmin.organizations.actions.enable") + " ")
      }
    } catch (error) {
      toast.error(t("superadmin.common.error"))
    }
  }

  const handleRestore = async () => {
    try {
      await restoreOrg({ orgId: org._id })
      toast.success("Organisme restauré")
    } catch {
      toast.error("Erreur lors de la restauration")
    }
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
        <DropdownMenuContent className="min-w-max" align="end">
          <DropdownMenuLabel>{org.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!isTrashed && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/reps/${org._id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t("superadmin.organizations.actions.view")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/reps/${org._id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t("superadmin.organizations.actions.edit")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/reps/${org._id}`}>
                  <Users className="mr-2 h-4 w-4" />
                  {t("superadmin.organizations.actions.manageMembers")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/reps/${org._id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  {t("superadmin.organizations.actions.manageServices")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleToggleStatus}
                disabled={isDisabling || isEnabling}
              >
                {org.isActive ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    {t("superadmin.organizations.actions.disable")}
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    {t("superadmin.organizations.actions.enable")}
                  </>
                )}
              </DropdownMenuItem>
              {isSuperAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Déplacer à la corbeille
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
          {isTrashed && isSuperAdmin && (
            <>
              <DropdownMenuItem onClick={handleRestore} disabled={isRestoring}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restaurer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowPurgeDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <ShieldAlert className="mr-2 h-4 w-4" />
                Purger définitivement
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isSuperAdmin && (
        <>
          <DeleteOrgDialog
            org={org}
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          />
          <PurgeOrgDialog
            org={org}
            open={showPurgeDialog}
            onOpenChange={setShowPurgeDialog}
          />
        </>
      )}
    </>
  )
}
