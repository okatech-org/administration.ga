"use client";

import { api } from "@convex/_generated/api";
import { ArrowLeft, Building2, Baby, Globe, Loader2, ShieldAlert, UserCircle, Users } from "lucide-react";
import { Link } from "@workspace/routing";
import { motion } from "motion/react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { FlatCard } from "../../components/my-space/flat-card";
import { useOrg } from "../../shell/org-provider";

import { AddToWatchlistButton } from "./AddToWatchlistButton";
import { IntelligenceBriefingButton } from "./IntelligenceBriefingButton";
import { IntelligenceLinksPanel } from "./IntelligenceLinksPanel";
import { IntelligenceNotesPanel } from "./IntelligenceNotesPanel";
import { RiskScoreBadge } from "./RiskScoreBadge";

type IntelTargetType = "profile" | "child_profile" | "diplomatic_target" | "agent";

const TYPE_META: Record<
	IntelTargetType,
	{ label: string; icon: React.ElementType; color: string }
> = {
	profile: { label: "Citoyen", icon: Users, color: "text-blue-600 dark:text-blue-400" },
	child_profile: { label: "Mineur", icon: Baby, color: "text-amber-600 dark:text-amber-400" },
	diplomatic_target: { label: "Contact diplomatique", icon: Building2, color: "text-emerald-600 dark:text-emerald-400" },
	agent: { label: "Agent", icon: UserCircle, color: "text-rose-600 dark:text-rose-400" },
};

interface Props {
	targetType: IntelTargetType;
	targetId: string;
}

function describeTarget(
	targetType: IntelTargetType,
	target: any,
): { title: string; subtitle?: string; country?: string } {
	if (!target) return { title: "Cible inconnue" };

	switch (targetType) {
		case "profile": {
			const fn = target.identity?.firstName ?? "";
			const ln = target.identity?.lastName ?? "";
			return {
				title: `${fn} ${ln}`.trim() || "(sans nom)",
				subtitle: target.matricule ?? undefined,
				country: target.countryOfResidence ?? undefined,
			};
		}
		case "child_profile":
			return {
				title:
					`${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() ||
					"(sans nom)",
			};
		case "diplomatic_target":
			return {
				title: target.name ?? "(sans nom)",
				subtitle: target.sector,
				country: target.country,
			};
		case "agent":
			return {
				title:
					`${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() ||
					target.email ||
					"(agent)",
				subtitle: target.email,
			};
	}
}

export default function IntelligenceProfileDetail({ targetType, targetId }: Props) {
	const { activeOrgId } = useOrg();

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligence.getProfileWithNotes,
		activeOrgId ? { orgId: activeOrgId, targetType, targetId } : "skip",
	);

	const { title, subtitle, country } = describeTarget(targetType, data?.target);
	const meta = TYPE_META[targetType];
	const Icon = meta.icon;
	const initials = title
		.split(" ")
		.map((s) => s[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase() || "?";

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto citizen-scrollbar">
			{/* Sticky breadcrumb */}
			<div className="flex items-center gap-3 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
				<Link href="/agence/profiles">
					<Button variant="ghost" size="sm">
						<ArrowLeft className="h-4 w-4 mr-1" /> Profils
					</Button>
				</Link>
				<div className="text-muted-foreground/40">/</div>
				<span className="text-sm font-medium truncate flex-1 min-w-0">{title}</span>
				<div className="flex items-center gap-2 shrink-0">
					<AddToWatchlistButton targetType={targetType} targetId={targetId} />
					<IntelligenceBriefingButton targetType={targetType} targetId={targetId} />
				</div>
			</div>

			{isPending ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					Chargement…
				</div>
			) : !data?.target ? (
				<FlatCard className="p-8 text-center text-sm text-muted-foreground">
					Cible introuvable.
				</FlatCard>
			) : (
				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.18 }}
					className="grid grid-cols-1 lg:grid-cols-12 gap-6"
				>
					{/* Left column: identity card */}
					<aside className="lg:col-span-4 space-y-4">
						<FlatCard>
							<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
								<div className="rounded-md bg-rose-500/10 p-1.5">
									<ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
								</div>
								<span className="text-base font-bold flex-1">Identité</span>
							</div>
							<div className="p-4 space-y-3">
								<div className="flex items-center gap-3">
									<Avatar className="h-14 w-14 border shrink-0">
										<AvatarFallback
											className={cn(
												"font-semibold text-base",
												"bg-rose-500/10",
												meta.color,
											)}
										>
											{initials}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0">
										<p className="font-semibold text-base leading-tight truncate">
											{title}
										</p>
										{subtitle && (
											<p className="text-xs text-muted-foreground truncate mt-0.5">
												{subtitle}
											</p>
										)}
									</div>
								</div>

								<div className="flex flex-wrap gap-1.5">
									<Badge
										variant="outline"
										className={cn(
											"text-[10px] h-5 px-2",
											"bg-rose-500/10 border-rose-500/20",
											meta.color,
										)}
									>
										<Icon className="h-2.5 w-2.5 mr-1" />
										{meta.label}
									</Badge>
									{country && (
										<Badge
											variant="outline"
											className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground border-border/50"
										>
											<Globe className="h-2.5 w-2.5 mr-1" />
											{country}
										</Badge>
									)}
								</div>

								<div className="pt-2 border-t border-border/30">
									<RiskScoreBadge targetType={targetType} targetId={targetId} />
								</div>
							</div>
						</FlatCard>

						{targetType === "child_profile" && (
							<FlatCard className="p-3 border-l-4 border-l-amber-500/70">
								<p className="text-xs font-medium text-amber-600 dark:text-amber-400">
									Profil mineur — usage encadré
								</p>
								<p className="text-[11px] text-muted-foreground mt-1">
									Toute consultation et annotation est tracée dans l'audit log.
								</p>
							</FlatCard>
						)}
					</aside>

					{/* Center + right combined: notes + relations */}
					<section className="lg:col-span-8 space-y-4">
						<IntelligenceNotesPanel
							targetType={targetType}
							targetId={targetId}
						/>
						<IntelligenceLinksPanel
							targetType={targetType}
							targetId={targetId}
						/>
					</section>
				</motion.div>
			)}
		</div>
	);
}
