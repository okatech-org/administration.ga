/**
 * Affaires Diplomatiques — 4 volets
 *
 * Cibles | Lettres de Contact | Plan Stratégique | Rapports
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import {
	BarChart3,
	BookOpen,
	Building2,
	FileText,
	Globe2,
	Loader2,
	Mail,
	MapPin,
	Plus,
	Target,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useOrg } from "@/components/org/org-provider";
import { useModuleAccess } from "@/components/shared/access-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/affaires-diplomatiques")({
	component: AffairesDiplomatiquesPage,
});

const TABS = [
	{ id: "cibles", label: "Cibles", icon: Target },
	{ id: "lettres", label: "Lettres de Contact", icon: Mail },
	{ id: "plans", label: "Plan Stratégique", icon: BookOpen },
	{ id: "rapports", label: "Rapports", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Configs visuelles
const TARGET_STATUS: Record<string, { label: string; color: string }> = {
	identified: { label: "Identifié", color: "bg-zinc-500/15 text-zinc-400" },
	contacted: { label: "Contacté", color: "bg-blue-500/15 text-blue-400" },
	in_discussion: { label: "En discussion", color: "bg-amber-500/15 text-amber-400" },
	partnership: { label: "Partenaire", color: "bg-emerald-500/15 text-emerald-400" },
	inactive: { label: "Inactif", color: "bg-red-500/15 text-red-400" },
};

const TARGET_TYPE: Record<string, { label: string; icon: typeof Building2 }> = {
	enterprise: { label: "Entreprise", icon: Building2 },
	government: { label: "Gouvernement", icon: Globe2 },
	ngo: { label: "ONG", icon: Target },
	international_org: { label: "Org. Internationale", icon: Globe2 },
	academic: { label: "Académique", icon: BookOpen },
	media: { label: "Média", icon: FileText },
	other: { label: "Autre", icon: Target },
};

const PRIORITY_COLOR: Record<string, string> = {
	low: "text-zinc-400",
	medium: "text-blue-400",
	high: "text-amber-400",
	critical: "text-red-400",
};

function AffairesDiplomatiquesPage() {
	const [activeTab, setActiveTab] = useState<TabId>("cibles");
	const { activeOrgId } = useOrg();
	const { hasMin: hasIntelAccess } = useModuleAccess("intelligence");
	const canEditIntel = hasIntelAccess("editor");

	return (
		<div className="flex flex-col gap-4 p-4 lg:p-6 h-full overflow-y-auto">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
			>
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
						<Globe2 className="h-5 w-5 text-emerald-500" />
					</div>
					<div>
						<h1 className="text-xl font-bold">Affaires Diplomatiques</h1>
						<p className="text-sm text-muted-foreground">
							Stratégie, cibles, lettres et rapports diplomatiques
						</p>
					</div>
				</div>
			</motion.div>

			{/* Tabs */}
			<div className="flex items-center gap-1 border border-border/50 rounded-xl bg-card p-1 overflow-x-auto">
				{TABS.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={cn(
								"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
								isActive
									? "bg-primary text-primary-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
							)}
						>
							<Icon className="h-4 w-4" />
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Content */}
			<div className="flex-1 min-h-0">
				{activeTab === "cibles" && activeOrgId && <CiblesTab orgId={activeOrgId} />}
				{activeTab === "lettres" && activeOrgId && <LettresTab orgId={activeOrgId} />}
				{activeTab === "plans" && activeOrgId && <PlansTab orgId={activeOrgId} />}
				{activeTab === "rapports" && activeOrgId && <RapportsTab orgId={activeOrgId} />}
			</div>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// TAB: CIBLES
// ═══════════════════════════════════════════════════════════════

function CiblesTab({ orgId }: { orgId: Id<"orgs"> }) {
	const { data: targets, isPending } = useAuthenticatedConvexQuery(
		api.functions.diplomaticAffairs.listTargets,
		{ orgId },
	);

	if (isPending) return <LoadingState />;

	if (!targets || targets.length === 0) {
		return (
			<EmptyState
				icon={Target}
				title="Aucune cible identifiée"
				description="Identifiez des entreprises, organismes ou partenaires potentiels pour votre mission diplomatique."
				actionLabel="Ajouter une cible"
			/>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
			{targets.map((target) => {
				const st = TARGET_STATUS[target.status] ?? TARGET_STATUS.identified;
				const tp = TARGET_TYPE[target.type] ?? TARGET_TYPE.other;
				const TpIcon = tp.icon;
				return (
					<Card key={target._id} className="hover:shadow-md transition-shadow">
						<CardHeader className="pb-2">
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-center gap-2 min-w-0">
									<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
										<TpIcon className="h-4 w-4 text-primary" />
									</div>
									<div className="min-w-0">
										<CardTitle className="text-sm truncate">{target.name}</CardTitle>
										<CardDescription className="text-[10px]">{tp.label}</CardDescription>
									</div>
								</div>
								<Badge className={cn("text-[9px] shrink-0", st.color)}>{st.label}</Badge>
							</div>
						</CardHeader>
						<CardContent className="space-y-2">
							{target.country && (
								<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
									<MapPin className="h-3 w-3" />
									{target.city ? `${target.city}, ${target.country}` : target.country}
								</div>
							)}
							{target.contactName && (
								<p className="text-xs text-muted-foreground">
									Contact : {target.contactName}
								</p>
							)}
							{target.description && (
								<p className="text-xs text-muted-foreground line-clamp-2">{target.description}</p>
							)}
							<div className="flex items-center gap-1.5 flex-wrap">
								<Badge variant="outline" className={cn("text-[8px]", PRIORITY_COLOR[target.priority])}>
									{target.priority}
								</Badge>
								{target.tags.slice(0, 3).map((tag) => (
									<Badge key={tag} variant="secondary" className="text-[8px]">{tag}</Badge>
								))}
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// TAB: LETTRES
// ═══════════════════════════════════════════════════════════════

function LettresTab({ orgId }: { orgId: Id<"orgs"> }) {
	const { data: letters, isPending } = useAuthenticatedConvexQuery(
		api.functions.diplomaticAffairs.listLetters,
		{ orgId },
	);

	if (isPending) return <LoadingState />;

	if (!letters || letters.length === 0) {
		return (
			<EmptyState
				icon={Mail}
				title="Aucune lettre de contact"
				description="Rédigez des courriers formels à destination de vos cibles diplomatiques et partenaires."
				actionLabel="Rédiger une lettre"
			/>
		);
	}

	const STATUS_LABEL: Record<string, string> = {
		draft: "Brouillon", pending_approval: "En attente", approved: "Approuvé",
		sent: "Envoyé", responded: "Répondu", archived: "Archivé",
	};

	return (
		<div className="space-y-2">
			{letters.map((letter) => (
				<Card key={letter._id} className="hover:shadow-md transition-shadow">
					<CardContent className="flex items-center gap-4 py-3">
						<div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
							<Mail className="h-5 w-5 text-cyan-500" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium truncate">{letter.subject}</p>
							<p className="text-xs text-muted-foreground">
								{letter.reference} • À : {letter.recipientName}
								{letter.recipientOrg && ` (${letter.recipientOrg})`}
							</p>
						</div>
						<Badge variant="outline" className="text-[9px] shrink-0">
							{STATUS_LABEL[letter.status] ?? letter.status}
						</Badge>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// TAB: PLANS
// ═══════════════════════════════════════════════════════════════

function PlansTab({ orgId }: { orgId: Id<"orgs"> }) {
	const { data: plans, isPending } = useAuthenticatedConvexQuery(
		api.functions.diplomaticAffairs.listPlans,
		{ orgId },
	);

	if (isPending) return <LoadingState />;

	if (!plans || plans.length === 0) {
		return (
			<EmptyState
				icon={BookOpen}
				title="Aucun plan stratégique"
				description="Définissez vos objectifs diplomatiques, économiques et culturels pour structurer votre mission."
				actionLabel="Créer un plan"
			/>
		);
	}

	const CAT_LABEL: Record<string, string> = {
		bilateral: "Bilatéral", economic: "Économique", cultural: "Culturel",
		security: "Sécurité", multilateral: "Multilatéral", other: "Autre",
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
			{plans.map((plan) => (
				<Card key={plan._id} className="hover:shadow-md transition-shadow">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm">{plan.title}</CardTitle>
							<Badge variant="outline" className="text-[9px]">
								{CAT_LABEL[plan.category] ?? plan.category}
							</Badge>
						</div>
						{plan.period && (
							<CardDescription className="text-[10px]">Période : {plan.period}</CardDescription>
						)}
					</CardHeader>
					<CardContent>
						{plan.objectives.length > 0 ? (
							<div className="space-y-1">
								{plan.objectives.slice(0, 3).map((obj, i) => (
									<div key={i} className="flex items-center gap-2 text-xs">
										<div className={cn(
											"h-1.5 w-1.5 rounded-full shrink-0",
											obj.status === "completed" ? "bg-emerald-400" :
											obj.status === "in_progress" ? "bg-blue-400" :
											obj.status === "cancelled" ? "bg-red-400" : "bg-zinc-400",
										)} />
										<span className="truncate">{obj.title}</span>
									</div>
								))}
								{plan.objectives.length > 3 && (
									<p className="text-[10px] text-muted-foreground">+{plan.objectives.length - 3} objectifs</p>
								)}
							</div>
						) : (
							<p className="text-xs text-muted-foreground italic">Aucun objectif défini</p>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// TAB: RAPPORTS
// ═══════════════════════════════════════════════════════════════

function RapportsTab({ orgId }: { orgId: Id<"orgs"> }) {
	const { data: reports, isPending } = useAuthenticatedConvexQuery(
		api.functions.diplomaticAffairs.listReports,
		{ orgId },
	);

	if (isPending) return <LoadingState />;

	if (!reports || reports.length === 0) {
		return (
			<EmptyState
				icon={BarChart3}
				title="Aucun rapport"
				description="Préparez des rapports d'activité, de situation ou de mission pour votre hiérarchie."
				actionLabel="Rédiger un rapport"
			/>
		);
	}

	const RECIPIENT_LABEL: Record<string, string> = {
		president: "Président", minister: "Ministre", secretary_general: "Secrétaire Général",
		direction: "Direction", other: "Autre",
	};
	const TYPE_LABEL: Record<string, string> = {
		activity: "Activité", situation: "Situation", mission: "Mission",
		economic: "Économique", security: "Sécurité", annual: "Annuel", other: "Autre",
	};

	return (
		<div className="space-y-2">
			{reports.map((report) => (
				<Card key={report._id} className="hover:shadow-md transition-shadow">
					<CardContent className="flex items-center gap-4 py-3">
						<div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
							<BarChart3 className="h-5 w-5 text-violet-500" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium truncate">{report.title}</p>
							<p className="text-xs text-muted-foreground">
								{TYPE_LABEL[report.type] ?? report.type} • Pour : {RECIPIENT_LABEL[report.recipient] ?? report.recipient}
								{report.period && ` • ${report.period}`}
							</p>
						</div>
						<Badge variant="outline" className="text-[9px] shrink-0">
							{report.status === "draft" ? "Brouillon" :
							 report.status === "pending_review" ? "En révision" :
							 report.status === "submitted" ? "Soumis" : report.status}
						</Badge>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════

function LoadingState() {
	return (
		<div className="flex items-center justify-center h-64">
			<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
		</div>
	);
}

function EmptyState({
	icon: Icon,
	title,
	description,
	actionLabel,
}: {
	icon: React.ElementType;
	title: string;
	description: string;
	actionLabel: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
				<Icon className="h-8 w-8 text-primary/60" />
			</div>
			<h3 className="text-lg font-semibold mb-1">{title}</h3>
			<p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
			<Button className="gap-1.5" disabled>
				<Plus className="h-4 w-4" />
				{actionLabel}
			</Button>
		</div>
	);
}
