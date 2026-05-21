"use client";

import Link from "next/link";
import { Users, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

interface TeamSnapshotProps {
	orgId: Id<"orgs">;
}

interface MemberDoc {
	_id: string;
	membershipId: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	avatarUrl?: string;
	name?: string;
}

interface OrgChartPosition {
	_id: string;
	title: { fr?: string; en?: string } | string;
	isRequired: boolean;
	isUnique?: boolean;
	occupants?: Array<{ userId: string }>;
	level?: number;
}

/**
 * W-G — Snapshot de l'équipe : avatars empilés + postes critiques vacants.
 */
export function TeamSnapshot({ orgId }: TeamSnapshotProps) {
	const { t } = useTranslation();

	const { data: members, isPending: isMembersLoading } =
		useAuthenticatedConvexQuery(api.functions.orgs.getMembers, { orgId });
	const { data: orgChart, isPending: isChartLoading } =
		useAuthenticatedConvexQuery(api.functions.orgs.getOrgChart, { orgId });

	const loading = isMembersLoading || isChartLoading;
	const memberList = (members as MemberDoc[] | undefined) ?? [];
	const positions =
		((orgChart as { positions?: OrgChartPosition[] } | undefined)?.positions ??
			[]) as OrgChartPosition[];

	const totalPositions =
		(orgChart as { totalPositions?: number } | undefined)?.totalPositions ?? 0;
	const filledPositions =
		(orgChart as { filledPositions?: number } | undefined)?.filledPositions ?? 0;

	const criticalVacant = positions
		.filter(
			(p) => p.isRequired && (!p.occupants || p.occupants.length === 0),
		)
		.slice(0, 3);

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<Users className="h-4 w-4" />}
					title={t(
						"superadmin.organizations.overview.team.title",
						"Équipe",
					)}
					actions={
						<Link
							href={`/reps/${orgId}?tab=agents`}
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							Voir tout →
						</Link>
					}
				/>

				{loading ? (
					<div className="space-y-3">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-4 w-32" />
					</div>
				) : (
					<div className="space-y-3">
						{/* Avatars empilés + total */}
						<div className="flex items-center gap-3">
							<div className="flex -space-x-2">
								{memberList.slice(0, 5).map((m) => {
									const initials = getInitials(m);
									return (
										<Avatar
											key={m._id}
											className="h-9 w-9 border-2 border-background"
										>
											{m.avatarUrl && (
												<AvatarImage src={m.avatarUrl} alt={m.email} />
											)}
											<AvatarFallback className="text-xs font-medium bg-muted">
												{initials}
											</AvatarFallback>
										</Avatar>
									);
								})}
								{memberList.length > 5 && (
									<div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold tabular-nums">
										+{memberList.length - 5}
									</div>
								)}
							</div>
							<div className="min-w-0">
								<p className="text-sm font-bold tabular-nums leading-tight">
									{memberList.length}
									<span className="text-xs font-normal text-muted-foreground ml-1">
										agent{memberList.length > 1 ? "s" : ""}
									</span>
								</p>
								<p className="text-[11px] text-muted-foreground">
									{filledPositions}/{totalPositions} postes pourvus
								</p>
							</div>
						</div>

						{/* Postes vacants critiques */}
						{criticalVacant.length > 0 && (
							<div
								className={cn(
									"rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5",
								)}
							>
								<p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1.5">
									<UserPlus className="h-3.5 w-3.5" />
									Postes critiques vacants
								</p>
								<ul className="space-y-0.5">
									{criticalVacant.map((p) => {
										const title =
											typeof p.title === "object"
												? p.title.fr ?? p.title.en ?? "—"
												: p.title;
										return (
											<li
												key={p._id}
												className="text-xs text-foreground/80 pl-5 before:content-['•'] before:mr-1.5 before:text-amber-500 before:-ml-3"
											>
												{title}
											</li>
										);
									})}
								</ul>
							</div>
						)}
					</div>
				)}
			</div>
		</FlatCard>
	);
}

function getInitials(m: MemberDoc): string {
	const first = m.firstName?.[0] ?? "";
	const last = m.lastName?.[0] ?? "";
	const initials = (first + last).toUpperCase();
	if (initials) return initials;
	return (m.email?.[0] ?? "?").toUpperCase();
}
