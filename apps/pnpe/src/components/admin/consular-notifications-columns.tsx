"use client";

import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
	BadgeCheck,
	Calendar,
	CheckCircle2,
	Clock,
	ExternalLink,
	User,
	XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface NotificationRow {
	_id: Id<"consularNotifications">;
	requestId: Id<"requests">;
	requestReference?: string;
	type?: string;
	status: string;
	signaledAt: number;
	stayStartDate?: string;
	stayEndDate?: string;
	profileId?: Id<"profiles"> | Id<"childProfiles">;
	profile?: {
		identity?: { firstName?: string; lastName?: string };
	} | null;
	user?: {
		_id: Id<"users">;
		email?: string;
		avatarUrl?: string;
	} | null;
}

// ═══════════════════════════════════════════════════════════════
// Status Badge Helper
// ═══════════════════════════════════════════════════════════════

function NotifStatusBadge({ status }: { status: string }) {
	const { t } = useTranslation();

	switch (status) {
		case "requested":
			return (
				<Badge variant="secondary">
					<Clock className="mr-1 h-3 w-3" />
					{t("dashboard.consularRegistry.badges.requested")}
				</Badge>
			);
		case "active":
			return (
				<Badge variant="default" className="bg-green-600">
					<BadgeCheck className="mr-1 h-3 w-3" />
					{t("dashboard.consularRegistry.badges.activeNoCard")}
				</Badge>
			);
		case "expired":
			return (
				<Badge variant="destructive">
					<XCircle className="mr-1 h-3 w-3" />
					{t("dashboard.consularRegistry.badges.expired")}
				</Badge>
			);
		default:
			return <Badge variant="outline">{status}</Badge>;
	}
}

// ═══════════════════════════════════════════════════════════════
// Actions Cell
// ═══════════════════════════════════════════════════════════════

export function NotificationActionsCell({
	row,
	onViewProfile,
}: {
	row: NotificationRow;
	onViewProfile: (notif: NotificationRow) => void;
}) {
	const { t } = useTranslation();

	return (
		<div className="flex justify-end gap-1">
			<Button
				size="icon"
				variant="ghost"
				asChild
				title={t("dashboard.consularRegistry.actions.viewRequest")}
			>
				<Link
					href={`/requests/${row.requestReference ?? row.requestId}`}
				>
					<ExternalLink className="h-4 w-4" />
				</Link>
			</Button>
			<Button
				size="icon"
				variant="ghost"
				title={t("dashboard.consularRegistry.actions.viewProfile")}
				onClick={() => onViewProfile(row)}
			>
				<User className="h-4 w-4" />
			</Button>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// Column Definitions
// ═══════════════════════════════════════════════════════════════

export function getNotificationColumns(
	t: (key: string, opts?: Record<string, unknown>) => string,
	i18nLang: string,
): ColumnDef<NotificationRow>[] {
	return [
		{
			id: "citizen",
			accessorFn: (row) =>
				`${row.profile?.identity?.firstName ?? ""} ${row.profile?.identity?.lastName ?? ""} ${row.user?.email ?? ""}`,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t(
						"dashboard.consularRegistry.notificationsTable.columns.citizen",
					)}
				/>
			),
			cell: ({ row }) => {
				const notif = row.original;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="h-8 w-8">
							<AvatarImage src={notif.user?.avatarUrl} />
							<AvatarFallback>
								{notif.profile?.identity?.firstName?.[0]}
								{notif.profile?.identity?.lastName?.[0]}
							</AvatarFallback>
						</Avatar>
						<div>
							<span className="font-medium">
								{notif.profile?.identity?.firstName}{" "}
								{notif.profile?.identity?.lastName}
							</span>
							<p className="text-xs text-muted-foreground">
								{notif.user?.email}
							</p>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "type",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t(
						"dashboard.consularRegistry.notificationsTable.columns.type",
					)}
				/>
			),
			cell: ({ row }) => (
				<span className="capitalize">{row.getValue("type") as string}</span>
			),
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t(
						"dashboard.consularRegistry.notificationsTable.columns.status",
					)}
				/>
			),
			cell: ({ row }) => <NotifStatusBadge status={row.original.status} />,
			filterFn: (row, _id, value) => {
				return value === row.original.status;
			},
		},
		{
			id: "stayPeriod",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t(
						"dashboard.consularRegistry.notificationsTable.columns.stayPeriod",
					)}
				/>
			),
			cell: ({ row }) => {
				const notif = row.original;
				const locale = i18nLang === "fr" ? "fr-FR" : "en-US";
				if (notif.stayStartDate && notif.stayEndDate) {
					return (
						<div className="flex items-center gap-1 text-sm">
							<Calendar className="h-3.5 w-3.5 text-muted-foreground" />
							<span>
								{new Date(notif.stayStartDate).toLocaleDateString(locale)}
							</span>
							<span className="text-muted-foreground">→</span>
							<span>
								{new Date(notif.stayEndDate).toLocaleDateString(locale)}
							</span>
						</div>
					);
				}
				return (
					<span className="text-muted-foreground text-sm">
						{t("dashboard.consularRegistry.notificationsTable.noStayDates")}
					</span>
				);
			},
		},
		{
			accessorKey: "signaledAt",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t(
						"dashboard.consularRegistry.notificationsTable.columns.signaledDate",
					)}
				/>
			),
			cell: ({ row }) =>
				new Date(row.getValue("signaledAt") as number).toLocaleDateString(
					i18nLang === "fr" ? "fr-FR" : "en-US",
				),
		},
		{
			id: "actions",
			header: () => (
				<span className="text-right block">
					{t("dashboard.consularRegistry.notificationsTable.columns.actions")}
				</span>
			),
			cell: () => null, // Placeholder — replaced in page
			enableSorting: false,
			enableHiding: false,
		},
	];
}
