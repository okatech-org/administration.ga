"use client"

import { useTranslation } from "react-i18next"
import { MoreHorizontal, Edit, Power, PowerOff } from "lucide-react"
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
import { useRouter } from "next/navigation"

interface ServiceActionsCellProps {
  service: Doc<"services">
}

export function ServiceActionsCell({ service }: ServiceActionsCellProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const { mutate: toggleService, isPending } = useConvexMutationQuery(
    api.functions.services.update
  )

  const handleToggleStatus = async () => {
    try {
      await toggleService({ serviceId: service._id, isActive: !service.isActive })
      toast.success(service.isActive
        ? t("superadmin.services.actions.disabled")
        : t("superadmin.services.actions.enabled")
      )
    } catch (error) {
      toast.error(t("superadmin.common.error"))
    }
  }

  const handleEdit = () => {
    router.push(`/services/${service._id}/edit`)
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
        <DropdownMenuLabel>{service.name.fr}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleEdit}>
          <Edit className="mr-2 h-4 w-4" />
          {t("superadmin.common.edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleToggleStatus}
          disabled={isPending}
        >
          {service.isActive ? (
            <>
              <PowerOff className="mr-2 h-4 w-4" />
              {t("superadmin.services.actions.disable")}
            </>
          ) : (
            <>
              <Power className="mr-2 h-4 w-4" />
              {t("superadmin.services.actions.enable")}
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
