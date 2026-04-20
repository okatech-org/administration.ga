"use client";

import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@workspace/routing";
import type { ColumnDef } from "@tanstack/react-table";
import {
	BadgeCheck,
	CheckCircle2,
	Clock,
	CreditCard,
	ExternalLink,
	Printer,
	User,
	XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { DataTableColumnHeader } from "@workspace/ui/components/data-table-column-header";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface RegistrationRow {
	_id: Id<"consularRegistrations">;
	requestId: Id<"requests">;
	requestReference?: string;
	type?: string;
	duration?: string;
	status: string;
	cardNumber?: string;
	registeredAt: number;
	printedAt?: number;
	isChildProfile?: boolean;
	profileId?: Id<"profiles"> | Id<"childProfiles">;
	profile?: {
		identity?: { firstName?: string | null; lastName?: string | null };
	} | null;
	user?: {
		email?: string | null;
		photoUrl?: string | null;
	} | null;
}

// ═══════════════════════════════════════════════════════════════
// Status Badge Helper
// ═══════════════════════════════════════════════════════════════

function StatusBadge({
	status,
	hasCard,
}: {
	status: string;
	hasCard: boolean;
}) {
	const { t } = useTranslation();

	if (status === "active" && hasCard) {
		return (
			<Badge variant="default" className="bg-green-600">
				<BadgeCheck className="mr-1 h-3 w-3" />
				{t("dashboard.consularRegistry.badges.cardGenerated")}
			</Badge>
		);
	}
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
				<Badge variant="outline" className="border-amber-500 text-amber-600">
					<CheckCircle2 className="mr-1 h-3 w-3" />
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

export function RegistrationActionsCell({
	row,
	onViewProfile,
	onGenerateCard,
	onMarkPrinted,
}: {
	row: RegistrationRow;
	onViewProfile: (reg: RegistrationRow) => void;
	onGenerateCard: (reg: RegistrationRow) => void;
	onMarkPrinted: (reg: RegistrationRow) => void;
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
					href={`/requests/${row.requestReference ?? ""}`}
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
			{row.status === "active" && !row.cardNumber && (
				<Button size="sm" variant="outline" onClick={() => onGenerateCard(row)}>
					<CreditCard className="h-4 w-4 mr-1" />
					{t("dashboard.consularRegistry.actions.generate")}
				</Button>
			)}
			{row.cardNumber && !row.printedAt && (
				<Button size="sm" variant="outline" onClick={() => onMarkPrinted(row)}>
					<Printer className="h-4 w-4 mr-1" />
					{t("dashboard.consularRegistry.actions.print")}
				</Button>
			)}
			{row.printedAt && (
				<Badge variant="secondary" className="text-xs">
					<CheckCircle2 className="h-3 w-3 mr-1" />
					{t("dashboard.consularRegistry.badges.printed")}
				</Badge>
			)}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// Column Definitions (factory — needs t() at call site)
// ═══════════════════════════════════════════════════════════════

export function getRegistrationColumns(
	t: (key: string, opts?: Record<string, unknown>) => string,
	i18nLang: string,
): ColumnDef<RegistrationRow>[] {
	return [
		{
			id: "citizen",
			accessorFn: (row) =>
				`${row.profile?.identity?.firstName ?? ""} ${row.profile?.identity?.lastName ?? ""} ${row.user?.email ?? ""}`,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("dashboard.consularRegistry.table.columns.citizen")}
				/>
			),
			cell: ({ row }) => {
				const reg = row.original;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="h-8 w-8">
							<AvatarImage src={reg.user?.photoUrl ?? undefined} />
							<AvatarFallback>
								{reg.profile?.identity?.firstName?.[0]}
								{reg.profile?.identity?.lastName?.[0]}
							</AvatarFallback>
						</Avatar>
						<div>
							<span className="font-medium">
								{reg.profile?.identity?.firstName}{" "}
								{reg.profile?.identity?.lastName}
							</span>
							<p className="text-xs text-muted-foreground">{reg.user?.email}</p>
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
					title={t("dashboard.consularRegistry.table.columns.type")}
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
					title={t("dashboard.consularRegistry.table.columns.status")}
				/>
			),
			cell: ({ row }) => {
				const reg = row.original;
				return <StatusBadge status={reg.status} hasCard={!!reg.cardNumber} />;
			},
			filterFn: (row, _id, value) => {
				return value === row.original.status;
			},
		},
		{
			accessorKey: "cardNumber",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("dashboard.consularRegistry.table.columns.cardNumber")}
				/>
			),
			cell: ({ row }) => {
				const cardNumber = row.getValue("cardNumber") as string | undefined;
				return cardNumber ? (
					<code className="text-xs bg-muted px-1 py-0.5 rounded">
						{cardNumber}
					</code>
				) : (
					<span className="text-muted-foreground">—</span>
				);
			},
		},
		{
			accessorKey: "registeredAt",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t("dashboard.consularRegistry.table.columns.registrationDate")}
				/>
			),
			cell: ({ row }) =>
				new Date(row.getValue("registeredAt") as number).toLocaleDateString(
					i18nLang === "fr" ? "fr-FR" : "en-US",
				),
		},
		{
			id: "actions",
			header: () => (
				<span className="text-right block">
					{t("dashboard.consularRegistry.table.columns.actions")}
				</span>
			),
			cell: () => null, // Placeholder — replaced in page via meta
			enableSorting: false,
			enableHiding: false,
		},
	];
}
