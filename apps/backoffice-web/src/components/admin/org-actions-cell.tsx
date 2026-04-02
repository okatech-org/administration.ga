"use client"

import { useTranslation } from "react-i18next"
import { MoreHorizontal, Eye, Edit, Users, FileText, Power, PowerOff } from "lucide-react"
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
import { Link } from "@tanstack/react-router"

interface OrgActionsCellProps {
  org: Doc<"orgs">
}

export function OrgActionsCell({ org }: OrgActionsCellProps) {
  const { t } = useTranslation()
  
  const { mutate: disableOrg, isPending: isDisabling } = useConvexMutationQuery(
    api.functions.admin.disableOrg
  )

  const { mutate: enableOrg, isPending: isEnabling } = useConvexMutationQuery(
    api.functions.admin.enableOrg
  )

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

  return (
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
        <DropdownMenuItem asChild>
          <Link to="/reps/$orgId" params={{ orgId: org._id }}>
            <Eye className="mr-2 h-4 w-4" />
            {t("superadmin.organizations.actions.view")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/reps/$orgId/edit" params={{ orgId: org._id }}>
            <Edit className="mr-2 h-4 w-4" />
            {t("superadmin.organizations.actions.edit")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/reps/$orgId" params={{ orgId: org._id }}>
            <Users className="mr-2 h-4 w-4" />
            {t("superadmin.organizations.actions.manageMembers")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/reps/$orgId" params={{ orgId: org._id }}>
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
