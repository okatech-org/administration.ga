"use client";

/**
 * agent-sections — Sections métier propres aux comptes Corps administratif.
 *
 * Quatre cartes affichées dans `/users/[userId]` quand le user est agent :
 *   1. Profil diplomatique détaillé (statut, langues, accréditations)
 *   2. Historique des affectations
 *   3. Performance / activité par module
 *   4. Signature officielle + photo protocolaire
 *
 * Une carte est rendue par membership (un agent peut être affecté à plusieurs
 * représentations). L'édition réutilise `DiplomaticProfileEditDialog` existant.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";
import {
	Activity,
	Award,
	Briefcase,
	Building2,
	CheckCircle2,
	Clock,
	Edit,
	History,
	Image as ImageIcon,
	IdCard,
	Inbox,
	Languages,
	PenTool,
	UserCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { DiplomaticProfileEditDialog } from "./diplomatic-profile-edit-dialog";
import { cn } from "@/lib/utils";

// ─── Helpers ───────────────────────────────────────────────
const formatDate = (timestamp?: number) =>
	timestamp ? new Date(timestamp).toLocaleDateString("fr-FR") : "—";

const formatRelative = (timestamp?: number | null) => {
	if (!timestamp) return "—";
	const diffMs = Date.now() - timestamp;
	const days = Math.floor(diffMs / 86400000);
	if (days === 0) return "Aujourd'hui";
	if (days === 1) return "Hier";
	if (days < 30) return `Il y a ${days} jours`;
	if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
	return `Il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? "s" : ""}`;
};

const STATUS_META: Record<string, { label: string; classes: string }> = {
	en_poste: { label: "En poste", classes: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400" },
	en_mission: { label: "En mission", classes: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-400" },
	en_conge: { label: "En congé", classes: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400" },
	en_formation: { label: "En formation", classes: "bg-violet-500/10 text-violet-700 border-violet-300 dark:text-violet-400" },
	rapatrie: { label: "Rapatrié", classes: "bg-zinc-500/10 text-zinc-700 border-zinc-300 dark:text-zinc-400" },
	detache: { label: "Détaché", classes: "bg-orange-500/10 text-orange-700 border-orange-300 dark:text-orange-400" },
};

const LANG_LEVEL_LABEL: Record<string, string> = {
	native: "Maternelle",
	fluent: "Courant",
	advanced: "Avancé",
	intermediate: "Intermédiaire",
	basic: "Notions",
};

interface AgentSectionProps {
	userId: Id<"users">;
	userName: string;
}

// ════════════════════════════════════════════════════════════
// 1. Profil diplomatique détaillé
// ════════════════════════════════════════════════════════════
export function AgentDiplomaticProfileSection({ userId, userName }: AgentSectionProps) {
	const { data: memberships, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.getUserMemberships,
		{ userId },
	);

	const [editMembership, setEditMembership] = useState<{
		membershipId: Id<"memberships">;
		diplomaticProfile: any;
	} | null>(null);

	const active = (memberships ?? []).filter((m: any) => !m.deletedAt);

	return (
		<>
			<FlatCard>
				<div className="p-3 lg:p-4">
					<SectionHeader
						icon={<UserCircle className="h-4 w-4" />}
						title="Profil diplomatique"
					/>
					<p className="text-xs text-muted-foreground mb-3">
						Statut professionnel, langues et accréditations par représentation
					</p>

					{isPending ? (
						<Skeleton className="h-32 w-full rounded-md" />
					) : active.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-6">
							Aucune affectation active.
						</p>
					) : (
						<div className="space-y-3">
							{active.map((m: any) => {
								const dp = m.diplomaticProfile ?? {};
								const status = dp.status ?? "en_poste";
								const statusMeta = STATUS_META[status] ?? STATUS_META.en_poste!;
								const languages = dp.languages ?? [];
								const credentials = dp.credentials ?? {};

								return (
									<div
										key={m._id}
										className="rounded-lg border bg-card overflow-hidden"
									>
										<div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
											<Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
											<span className="text-sm font-medium truncate flex-1">
												{m.org?.name ?? "—"}
											</span>
											<Badge variant="outline" className={cn("text-xs", statusMeta.classes)}>
												{statusMeta.label}
											</Badge>
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6 shrink-0"
												title="Modifier le profil diplomatique"
												onClick={() =>
													setEditMembership({
														membershipId: m._id as Id<"memberships">,
														diplomaticProfile: dp,
													})
												}
											>
												<Edit className="h-3.5 w-3.5" />
											</Button>
										</div>

										<div className="p-3 space-y-2.5">
											{dp.startDate && (
												<div className="flex items-center justify-between text-sm">
													<span className="text-muted-foreground">Prise de poste</span>
													<span>{formatDate(dp.startDate)}</span>
												</div>
											)}

											{(dp.officePhone || dp.officialEmail) && (
												<div className="space-y-1">
													{dp.officePhone && (
														<div className="flex items-center justify-between text-sm">
															<span className="text-muted-foreground">Téléphone bureau</span>
															<span className="font-mono text-xs">
																{dp.officePhone}
																{dp.officeExtension && ` ext. ${dp.officeExtension}`}
															</span>
														</div>
													)}
													{dp.officialEmail && (
														<div className="flex items-center justify-between text-sm">
															<span className="text-muted-foreground">Email officiel</span>
															<span className="text-xs">{dp.officialEmail}</span>
														</div>
													)}
												</div>
											)}

											{languages.length > 0 && (
												<div className="space-y-1.5">
													<div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
														<Languages className="h-3 w-3" />
														Langues
													</div>
													<div className="flex flex-wrap gap-1">
														{languages.map((lang: any, i: number) => (
															<Badge
																key={`${m._id}-lang-${i}`}
																variant="outline"
																className="text-[10px] h-5"
															>
																{lang.code?.toUpperCase()} ·{" "}
																{LANG_LEVEL_LABEL[lang.level] ?? lang.level}
															</Badge>
														))}
													</div>
												</div>
											)}

											{(credentials.lettersOfCredence ||
												credentials.diplomaticCard ||
												credentials.diplomaticPassport ||
												credentials.exequatur) && (
												<div className="space-y-1.5">
													<div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
														<Award className="h-3 w-3" />
														Accréditations
													</div>
													<div className="grid grid-cols-2 gap-1">
														{credentials.lettersOfCredence?.presentedDate && (
															<div className="text-[11px] flex items-center gap-1">
																<CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
																<span className="text-muted-foreground">
																	Lettres : {formatDate(credentials.lettersOfCredence.presentedDate)}
																</span>
															</div>
														)}
														{credentials.diplomaticCard?.number && (
															<div className="text-[11px] flex items-center gap-1">
																<IdCard className="h-3 w-3 text-blue-500 shrink-0" />
																<span className="text-muted-foreground truncate">
																	Carte {credentials.diplomaticCard.number}
																</span>
															</div>
														)}
														{credentials.diplomaticPassport?.number && (
															<div className="text-[11px] flex items-center gap-1">
																<Briefcase className="h-3 w-3 text-violet-500 shrink-0" />
																<span className="text-muted-foreground truncate">
																	Passeport {credentials.diplomaticPassport.number}
																</span>
															</div>
														)}
														{credentials.exequatur?.grantedDate && (
															<div className="text-[11px] flex items-center gap-1">
																<CheckCircle2 className="h-3 w-3 text-amber-500 shrink-0" />
																<span className="text-muted-foreground">
																	Exequatur : {formatDate(credentials.exequatur.grantedDate)}
																</span>
															</div>
														)}
													</div>
												</div>
											)}

											{dp.bio && (
												<div className="pt-1 border-t">
													<p className="text-xs text-muted-foreground italic line-clamp-3">
														{dp.bio}
													</p>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</FlatCard>

			{editMembership && (
				<DiplomaticProfileEditDialog
					open={!!editMembership}
					onOpenChange={(open) => !open && setEditMembership(null)}
					membershipId={editMembership.membershipId}
					memberName={userName}
					currentProfile={editMembership.diplomaticProfile}
				/>
			)}
		</>
	);
}

// ════════════════════════════════════════════════════════════
// 2. Historique des affectations
// ════════════════════════════════════════════════════════════
export function AgentPostingsHistorySection({ userId }: AgentSectionProps) {
	const { data: memberships, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.getUserMemberships,
		{ userId },
	);

	// Agrège previousPostings de tous les memberships, dédupliqué et trié desc.
	const allPostings = (memberships ?? []).flatMap((m: any) => {
		const dp = m.diplomaticProfile;
		return (dp?.previousPostings ?? []) as Array<{
			position: string;
			orgName: string;
			country: string;
			startDate: number;
			endDate?: number;
		}>;
	});

	const sorted = [...allPostings].sort((a, b) => b.startDate - a.startDate);

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<History className="h-4 w-4" />}
					title="Historique des affectations"
				/>
				<p className="text-xs text-muted-foreground mb-3">
					Postes précédents, hors affectation courante
				</p>

				{isPending ? (
					<div className="space-y-2">
						{[1, 2].map((i) => (
							<Skeleton key={i} className="h-14 w-full rounded-md" />
						))}
					</div>
				) : sorted.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-6">
						Aucun poste précédent renseigné.
					</p>
				) : (
					<div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-px before:bg-border">
						{sorted.map((posting, idx) => (
							<div key={`posting-${idx}`} className="relative">
								<div className="absolute -left-[12px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
								<div className="rounded-md border bg-card p-2.5">
									<p className="text-sm font-medium truncate">{posting.position}</p>
									<p className="text-xs text-muted-foreground truncate">
										{posting.orgName}
										{posting.country && (
											<>
												<span className="mx-1.5">·</span>
												{posting.country}
											</>
										)}
									</p>
									<p className="text-[11px] text-muted-foreground mt-1">
										{formatDate(posting.startDate)}
										<span className="mx-1.5"></span>
										{posting.endDate ? formatDate(posting.endDate) : "présent"}
									</p>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</FlatCard>
	);
}

// ════════════════════════════════════════════════════════════
// 3. Performance / activité par module
// ════════════════════════════════════════════════════════════
export function AgentPerformanceSection({ userId }: AgentSectionProps) {
	const { data: memberships, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.getUserMemberships,
		{ userId },
	);

	const active = (memberships ?? []).filter((m: any) => !m.deletedAt);

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<Activity className="h-4 w-4" />}
					title="Performance"
				/>
				<p className="text-xs text-muted-foreground mb-3">
					Demandes assignées sur les 90 derniers jours
				</p>

				{isPending ? (
					<Skeleton className="h-24 w-full rounded-md" />
				) : active.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-6">
						Aucune affectation à analyser.
					</p>
				) : (
					<div className="space-y-2.5">
						{active.map((m: any) => (
							<MembershipPerformanceCard
								key={m._id}
								membershipId={m._id as Id<"memberships">}
								orgName={m.org?.name ?? "—"}
							/>
						))}
					</div>
				)}
			</div>
		</FlatCard>
	);
}

function MembershipPerformanceCard({
	membershipId,
	orgName,
}: {
	membershipId: Id<"memberships">;
	orgName: string;
}) {
	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.getMembershipPerformance,
		{ membershipId },
	);

	if (isPending) {
		return <Skeleton className="h-16 w-full rounded-md" />;
	}
	if (!data) {
		return null;
	}

	return (
		<div className="rounded-md border bg-card p-3">
			<div className="flex items-center gap-2 mb-2">
				<Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
				<span className="text-sm font-medium truncate flex-1">{orgName}</span>
			</div>
			<div className="grid grid-cols-3 gap-2">
				<KpiTile
					icon={<Inbox className="h-3.5 w-3.5" />}
					label="Assignées"
					value={data.assignedTotal}
					tone="neutral"
				/>
				<KpiTile
					icon={<Clock className="h-3.5 w-3.5" />}
					label="En cours"
					value={data.recentOpenCount}
					tone="amber"
				/>
				<KpiTile
					icon={<CheckCircle2 className="h-3.5 w-3.5" />}
					label="Clôturées"
					value={data.recentClosedCount}
					tone="emerald"
				/>
			</div>
			<p className="text-[11px] text-muted-foreground mt-2 text-right">
				Dernière action : {formatRelative(data.lastActivityAt)}
			</p>
		</div>
	);
}

function KpiTile({
	icon,
	label,
	value,
	tone,
}: {
	icon: React.ReactNode;
	label: string;
	value: number;
	tone: "neutral" | "amber" | "emerald";
}) {
	const toneClass = {
		neutral: "text-foreground",
		amber: "text-amber-600 dark:text-amber-400",
		emerald: "text-emerald-600 dark:text-emerald-400",
	}[tone];

	return (
		<div className="rounded-md bg-muted/30 px-2 py-2 text-center">
			<div className={cn("flex items-center justify-center gap-1 text-xs", toneClass)}>
				{icon}
				<span className="font-semibold tabular-nums">{value}</span>
			</div>
			<p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
		</div>
	);
}

// ════════════════════════════════════════════════════════════
// 4. Signature officielle + photo protocolaire
// ════════════════════════════════════════════════════════════
export function AgentSignatureSection({ userId, userName }: AgentSectionProps) {
	const { data: memberships, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.getUserMemberships,
		{ userId },
	);

	const [editMembership, setEditMembership] = useState<{
		membershipId: Id<"memberships">;
		diplomaticProfile: any;
	} | null>(null);

	const active = (memberships ?? []).filter((m: any) => !m.deletedAt);

	return (
		<>
			<FlatCard>
				<div className="p-3 lg:p-4">
					<SectionHeader
						icon={<PenTool className="h-4 w-4" />}
						title="Signature & photo officielle"
					/>
					<p className="text-xs text-muted-foreground mb-3">
						Signature pour iCorrespondance / iDocument et photo protocolaire
					</p>

					{isPending ? (
						<Skeleton className="h-24 w-full rounded-md" />
					) : active.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-6">
							Aucune affectation active.
						</p>
					) : (
						<div className="space-y-3">
							{active.map((m: any) => {
								const dp = m.diplomaticProfile ?? {};
								const hasSignature = !!dp.officialSignature?.imageStorageId;
								const hasPhoto = !!dp.officialPhotoStorageId;
								return (
									<div key={m._id} className="rounded-lg border bg-card p-3">
										<div className="flex items-center gap-2 mb-2.5">
											<Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
											<span className="text-sm font-medium truncate flex-1">
												{m.org?.name ?? "—"}
											</span>
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs"
												onClick={() =>
													setEditMembership({
														membershipId: m._id as Id<"memberships">,
														diplomaticProfile: dp,
													})
												}
											>
												<Edit className="h-3.5 w-3.5 mr-1" />
												Gérer
											</Button>
										</div>

										<div className="grid grid-cols-2 gap-3">
											<div className="space-y-1">
												<div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
													<PenTool className="h-3 w-3" />
													Signature officielle
												</div>
												<div className="aspect-[3/1] rounded border bg-muted/20 flex items-center justify-center">
													{hasSignature ? (
														<Badge
															variant="outline"
															className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400"
														>
															<CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
															Configurée
														</Badge>
													) : (
														<span className="text-[10px] text-muted-foreground">
															Non configurée
														</span>
													)}
												</div>
												{dp.officialSignature?.uploadedAt && (
													<p className="text-[10px] text-muted-foreground text-center">
														MAJ {formatDate(dp.officialSignature.uploadedAt)}
													</p>
												)}
											</div>

											<div className="space-y-1">
												<div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
													<ImageIcon className="h-3 w-3" />
													Photo protocolaire
												</div>
												<div className="aspect-square rounded border bg-muted/20 flex items-center justify-center max-h-20 mx-auto w-20">
													{hasPhoto ? (
														<Avatar className="h-full w-full rounded">
															<AvatarFallback className="rounded text-xs">
																<CheckCircle2 className="h-4 w-4 text-emerald-500" />
															</AvatarFallback>
														</Avatar>
													) : (
														<span className="text-[10px] text-muted-foreground">
															Non configurée
														</span>
													)}
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</FlatCard>

			{editMembership && (
				<DiplomaticProfileEditDialog
					open={!!editMembership}
					onOpenChange={(open) => !open && setEditMembership(null)}
					membershipId={editMembership.membershipId}
					memberName={userName}
					currentProfile={editMembership.diplomaticProfile}
				/>
			)}
		</>
	);
}
