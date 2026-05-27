/**
 * Utilisateurs PNPE — backoffice ministère du Travail.
 *
 * Liste du staff PNPE national : DG, admin ministère, chefs d'antenne,
 * conseillers, formateurs Auto-Emploi. Affichage RBAC : rôle PNPE +
 * antenne de rattachement + modules accessibles.
 *
 * MVP lecture seule. Mutations RBAC (activer/désactiver, réaffecter)
 * arriveront dans une PR ultérieure une fois la matrice de permissions
 * validée avec la direction PNPE.
 */
"use client";

import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Briefcase,
	GraduationCap,
	MapPin,
	PowerIcon,
	Shield,
	UserCheck,
	Users,
} from "lucide-react";

// ─── Référentiel rôles PNPE ───────────────────────────────────

const ROLE_META: Record<
	string,
	{ label: string; tone: string; icon: React.ElementType }
> = {
	direction_pnpe: {
		label: "Direction PNPE",
		tone: "indigo",
		icon: Shield,
	},
	admin_ministere_travail: {
		label: "Admin Ministère du Travail",
		tone: "rose",
		icon: Shield,
	},
	chef_antenne_pnpe: {
		label: "Chef d'antenne",
		tone: "amber",
		icon: Briefcase,
	},
	conseiller_pnpe: {
		label: "Conseiller PNPE",
		tone: "emerald",
		icon: UserCheck,
	},
	formateur_auto_emploi: {
		label: "Formateur Auto-Emploi",
		tone: "blue",
		icon: GraduationCap,
	},
};

const TONE_CLASS: Record<string, string> = {
	indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
	rose: "bg-rose-500/10 text-rose-600 border-rose-500/20",
	amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
	emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
	blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
	slate: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

function getRoleMeta(role: string) {
	return (
		ROLE_META[role] ?? { label: role, tone: "slate", icon: Users }
	);
}

// ─── Page ─────────────────────────────────────────────────────

export default function PnpeUtilisateursPage() {
	const { t } = useTranslation();
	const toggleStaffActive = useMutation(
		api.functions.pnpe.antennes.toggleStaffActive,
	);

	const { data: staff, isLoading } = useAuthenticatedConvexQuery(
		api.functions.pnpe.backofficeQueries.listStaff,
		{},
	);

	const onToggleActive = async (id: Id<"pnpeStaffAssignments">) => {
		try {
			const res = await toggleStaffActive({ staffId: id });
			toast.success(
				res.next ? "Agent réactivé." : "Agent désactivé.",
			);
		} catch (err) {
			const m = err instanceof Error ? err.message : "Erreur";
			if (m.includes("INSUFFICIENT_PERMISSIONS")) {
				toast.error("Permissions insuffisantes.");
			} else {
				toast.error(m);
			}
		}
	};

	const list = (staff ?? []) as any[];
	const byRole: Record<string, number> = {};
	let actifs = 0;
	for (const s of list) {
		byRole[s.pnpeRole] = (byRole[s.pnpeRole] ?? 0) + 1;
		if (s.isActive) actifs++;
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("pnpe.utilisateurs.title", "Utilisateurs PNPE")}
				subtitle={t(
					"pnpe.utilisateurs.subtitle",
					"Staff national — DG, admin ministère, chefs d'antenne, conseillers, formateurs Auto-Emploi",
				)}
				icon={Users}
			/>

			{/* ─── Synthèse rôles ──────────────────────── */}
			<section>
				<SectionHeader
					icon={<Shield />}
					title={t("pnpe.utilisateurs.synthesis.title", "Répartition par rôle")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.utilisateurs.synthesis.subtitle",
						`Total : ${list.length} agents (${actifs} actifs)`,
					)}
				</p>
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
					{isLoading ? (
						<>
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</>
					) : (
						Object.entries(ROLE_META).map(([role, meta]) => {
							const Icon = meta.icon;
							const count = byRole[role] ?? 0;
							return (
								<FlatCard
									key={role}
									className={TONE_CLASS[meta.tone]?.replace(
										/^bg-/,
										"border-",
									) ?? ""}
								>
									<div className="p-3">
										<div className="flex items-center gap-1.5 text-xs font-medium">
											<Icon className="h-3.5 w-3.5" />
											<span className="truncate">{meta.label}</span>
										</div>
										<div className="text-2xl font-semibold mt-1 tabular-nums">
											{count}
										</div>
									</div>
								</FlatCard>
							);
						})
					)}
				</div>
			</section>

			{/* ─── Liste détaillée ────────────────────── */}
			<section>
				<SectionHeader
					icon={<Users />}
					title={t("pnpe.utilisateurs.list.title", "Annuaire détaillé")}
				/>
				<p className="text-xs text-muted-foreground -mt-1 mb-3">
					{t(
						"pnpe.utilisateurs.list.subtitle",
						"Source : convex/seeds/pnpe/staffAccountsPnpe.ts (23 comptes démo)",
					)}
				</p>
				<FlatCard>
					<div className="p-1">
						{isLoading ? (
							<div className="p-3 space-y-2">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : list.length === 0 ? (
							<div className="p-6 text-sm text-muted-foreground text-center">
								{t(
									"pnpe.utilisateurs.list.empty",
									"Aucun staff PNPE enregistré. Lancer le seed `staffAccountsPnpe.ts`.",
								)}
							</div>
						) : (
							<div className="divide-y">
								{list.map((s) => {
									const meta = getRoleMeta(s.pnpeRole);
									const RoleIcon = meta.icon;
									return (
										<div
											key={s._id}
											className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
										>
											{/* Initiales */}
											<div
												className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${TONE_CLASS[meta.tone]}`}
											>
												{`${s.prenoms?.[0] ?? ""}${s.nom?.[0] ?? ""}`.toUpperCase() ||
													"?"}
											</div>

											{/* Identité + fonction */}
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<span className="font-medium truncate">
														{s.prenoms} {s.nom}
													</span>
													{!s.isActive && (
														<Badge variant="outline" className="text-xs">
															Inactif
														</Badge>
													)}
												</div>
												<div className="text-xs text-muted-foreground truncate">
													{s.fonctionAffichee}
												</div>
											</div>

											{/* Rôle */}
											<Badge variant="outline" className="gap-1 shrink-0 text-xs">
												<RoleIcon className="h-3 w-3" />
												{meta.label}
											</Badge>

											{/* Antenne */}
											{s.antenneNom && (
												<div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0 max-w-[180px]">
													<MapPin className="h-3 w-3" />
													<span className="truncate">{s.antenneNom}</span>
												</div>
											)}

											{/* Toggle actif/inactif */}
											<Button
												size="sm"
												variant="ghost"
												className="h-8 gap-1 text-xs shrink-0"
												onClick={() =>
													onToggleActive(
														s._id as Id<"pnpeStaffAssignments">,
													)
												}
												title={
													s.isActive
														? "Désactiver l'agent"
														: "Réactiver l'agent"
												}
											>
												<PowerIcon
													className={`h-3.5 w-3.5 ${s.isActive ? "text-emerald-600" : "text-muted-foreground"}`}
												/>
											</Button>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</FlatCard>
			</section>
		</div>
	);
}
