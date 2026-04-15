"use client"

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Clock,
  CreditCard,
  FileText,
  Inbox,
  MessageSquare,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import {
  useAuthenticatedConvexQuery,
  useAuthenticatedPaginatedQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks"
import { cn } from "@/lib/utils"

const notificationIcons: Record<string, typeof Bell> = {
  new_message: MessageSquare,
  status_update: FileText,
  payment_success: CreditCard,
  action_required: AlertTriangle,
  reminder: Clock,
}

export function NotificationDropdown({
  className,
}: {
  className?: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const { data: unreadCount } = useAuthenticatedConvexQuery(
    api.functions.notifications.getUnreadCount,
    {}
  )
  const {
    results: notifications,
    status: paginationStatus,
    loadMore,
  } = useAuthenticatedPaginatedQuery(
    api.functions.notifications.list,
    {},
    { initialNumItems: 30 },
  )
  const { mutate: markAsRead } = useConvexMutationQuery(
    api.functions.notifications.markAsRead,
  )
  const { mutate: markAllAsRead } = useConvexMutationQuery(
    api.functions.notifications.markAllAsRead,
  )

  const count = unreadCount ?? 0

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(className)}
        onClick={() => setOpen(true)}
      >
        <div className="relative inline-flex items-center justify-center">
          <Bell className="size-[22px]" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-background">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </div>
      </Button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={t("mySpace.screens.notifications.heading")}
        icon={<Bell className="h-4 w-4" />}
        maxHeight="85vh"
        footer={
          count > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => markAllAsRead({})}
            >
              <CheckCheck className="h-4 w-4" />
              {t("notifications.markAllRead")}
            </Button>
          ) : undefined
        }
      >
        <div className="px-4 py-3 sm:px-5">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-1 text-sm font-medium">
                {t("notifications.empty.title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("notifications.empty.description")}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {notifications.map((notification: any) => {
                const Icon = notificationIcons[notification.type] || Bell
                const timeAgo = formatDistanceToNow(
                  new Date(notification.createdAt),
                  { addSuffix: true, locale: fr },
                )

                return (
                  <Link
                    key={notification._id}
                    href={notification.link || "/my-space/notifications"}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead({ notificationId: notification._id as Id<"notifications"> })
                      }
                      setOpen(false)
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-xl p-3 transition-colors",
                      notification.isRead
                        ? "hover:bg-muted/50"
                        : "bg-primary/5 hover:bg-primary/10",
                    )}
                  >
                    <div
                      className={cn(
                        "shrink-0 rounded-full p-2",
                        notification.isRead
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-snug", !notification.isRead && "font-semibold")}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <Badge variant="default" className="shrink-0 text-[10px]">
                            {t("notifications.new")}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {timeAgo}
                      </p>
                    </div>
                  </Link>
                )
              })}

              {paginationStatus === "CanLoadMore" && (
                <div className="pt-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => loadMore(30)}
                  >
                    {t("notifications.loadMore")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  )
}
