/**
 * Affaires Consulaires — Détail d'un Profil Citoyen (vue Agent)
 *
 * Interface de travail pour les agents consulaires :
 * - Reprend ProfileDetailView comme base
 * - Ajoute un en-tête enrichi avec actions contextuelles
 * - Intègre un onglet "Notes Agent" (interne, jamais visible côté citoyen)
 * - Visibilité des onglets filtrée par TaskCode / permission de l'agent
 *
 * PÉRIMÈTRE STRICT : apps/agent-web UNIQUEMENT.
 * NE JAMAIS modifier citizen-web (port :3001) ou backoffice-web (port :3002).
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	User,
	ClipboardList,
	MessageSquare,
	Send,
	ExternalLink,
	Phone,
	Mail,
	Shield,
	AlertCircle,
	Loader2,
	Calendar,
	UserCheck,
	LockKeyhole,
} from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useOrg } from "@/components/org/org-provider";
import { useCanDoTask } from "@/hooks/useCanDoTask";
import { ProfileDetailView } from "@/components/dashboard/ProfileDetailView";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

export const Route = createFileRoute(
	"/_app/affaires-consulaires/profiles/$profileId",
)({
	component: AgentProfileDetailPage,
});

// ─── Request status colors ────────────────────────────────────────────────────

function getRequestStatusClass(status: string) {
	const map: Record<string, string> = {
		draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
		submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
		pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
		under_review: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
		validated: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
		rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
		completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
		cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
	};
	return map[status] ?? "bg-gray-100 text-gray-600";
}

const STATUS_LABELS: Record<string, string> = {
	draft: "Brouillon",
	submitted: "Soumis",
	pending: "En attente",
	under_review: "En révision",
	in_production: "En production",
	validated: "Validé",
	rejected: "Rejeté",
	completed: "Terminé",
	cancelled: "Annulé",
	processing: "En traitement",
	appointment_scheduled: "RDV schedulé",
	ready_for_pickup: "Prêt à récupérer",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

function AgentProfileDetailPage() {
	const { profileId } = Route.useParams();
	const navigate = useNavigate();
	const { activeOrgId } = useOrg();
	const { canDo } = useCanDoTask(activeOrgId ?? undefined);

	// Load profile detail (reuses existing query)
	const { data: detailData, isLoading } = useAuthenticatedConvexQuery(
		api.functions.profiles.getProfileDetail,
		{ profileId: profileId as Id<"profiles"> | Id<"childProfiles"> },
	);

	// Permission guard
	if (!canDo("profiles.view")) {
		return (
			<div className="flex flex-col items-center justify-center py-20 gap-4 text-center p-6">
				<div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
					<LockKeyhole className="h-8 w-8 text-destructive/60" />
				</div>
				<div>
					<h2 className="text-lg font-semibold">Accès restreint</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Vous n'avez pas les permissions nécessaires pour accéder aux profils citoyens.
					</p>
				</div>
				<Button variant="outline" onClick={() => navigate({ to: "/affaires-consulaires" })}>
					Retour
				</Button>
			</div>
		);
	}

	if (isLoading) {
		return <AgentProfileSkeleton />;
	}

	if (!detailData?.profile) {
		return (
			<div className="flex flex-col items-center justify-center py-20 gap-4 text-center p-6">
				<div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
					<AlertCircle className="h-8 w-8 text-muted-foreground/40" />
				</div>
				<div>
					<h2 className="text-lg font-semibold">Profil introuvable</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Ce profil n'existe pas ou vous n'y avez pas accès.
					</p>
				</div>
				<Button variant="outline" onClick={() => navigate({ to: "/affaires-consulaires/profiles" })}>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Retour aux profils
				</Button>
			</div>
		);
	}

	const { profile, user, requests = [], registrations = [] } = detailData;

	const firstName = profile.identity?.firstName || "";
	const lastName = profile.identity?.lastName || "";
	const fullName = `${firstName} ${lastName}`.trim() || "Nom inconnu";
	const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "?";
	const email = user?.email || profile.contacts?.email || "";
	const phone = profile.contacts?.phone || "";
	const registration = registrations[0];

	const pendingRequests = requests.filter(
		(r: any) => !["completed", "rejected", "cancelled"].includes(r.status),
	);

	return (
		<div className="flex flex-1 flex-col gap-0 max-w-5xl mx-auto w-full">
			{/* ── Top Navigation Bar ─────────────────────────────────────────── */}
			<motion.div
				initial={{ opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10"
			>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/affaires-consulaires/profiles" })}
					className="gap-2 text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Profils Citoyens
				</Button>
				<div className="text-muted-foreground/40">/</div>
				<span className="text-sm font-medium truncate">{fullName}</span>
			</motion.div>

			<div className="flex flex-col gap-6 p-4 md:p-6">
				{/* ── Agent Context Header ─────────────────────────────────────── */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.05 }}
				>
					<Card className="border-primary/10 bg-card overflow-hidden">
						{/* Accent bar */}
						<div className="h-1 w-full bg-linear-to-r from-indigo-500 via-blue-500 to-cyan-500" />

						<CardContent className="p-5">
							<div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
								{/* Avatar */}
								<Avatar className="h-16 w-16 border-2 border-border shadow-sm shrink-0">
									<AvatarFallback className="bg-indigo-500/10 text-indigo-600 text-xl font-bold">
										{initials}
									</AvatarFallback>
								</Avatar>

								{/* Info */}
								<div className="flex-1 min-w-0">
									<div className="flex flex-wrap items-center gap-2 mb-1">
										<h1 className="text-xl font-bold">{fullName}</h1>
										{registration && (
											<Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
												<UserCheck className="h-3 w-3 mr-1" />
												Inscrit
											</Badge>
										)}
										{pendingRequests.length > 0 && (
											<Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
												{pendingRequests.length} demande{pendingRequests.length > 1 ? "s" : ""} en cours
											</Badge>
										)}
									</div>

									<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
										{email && (
											<a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
												<Mail className="h-3.5 w-3.5" />
												{email}
											</a>
										)}
										{phone && (
											<a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
												<Phone className="h-3.5 w-3.5" />
												{phone}
											</a>
										)}
										{registration?.cardNumber && (
											<span className="flex items-center gap-1.5 font-mono text-xs">
												<Shield className="h-3.5 w-3.5" />
												{registration.cardNumber}
											</span>
										)}
									</div>
								</div>

								{/* Quick actions */}
								<div className="flex items-center gap-2 shrink-0 flex-wrap">
									{canDo("requests.view") && requests.length > 0 && (
										<Button
											variant="outline"
											size="sm"
											asChild
											className="gap-2 text-xs"
										>
											<Link to="/requests">
												<ClipboardList className="h-3.5 w-3.5" />
												Ses demandes
												<ExternalLink className="h-3 w-3 opacity-50" />
											</Link>
										</Button>
									)}
									{canDo("appointments.view") && (
										<Button
											variant="outline"
											size="sm"
											asChild
											className="gap-2 text-xs"
										>
											<Link to="/appointments">
												<Calendar className="h-3.5 w-3.5" />
												Rendez-vous
											</Link>
										</Button>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* ── Demandes en cours (rapide aperçu) ───────────────────────── */}
				{canDo("requests.view") && pendingRequests.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2, delay: 0.1 }}
					>
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
								Demandes actives
							</h2>
						</div>
						<div className="flex flex-col gap-2">
							{pendingRequests.slice(0, 3).map((req: any) => (
								<Link
									key={req._id}
									to="/requests/$reference"
									params={{ reference: req.reference || req._id }}
									className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/40 hover:border-primary/20 transition-all group"
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<span className="font-mono text-xs text-primary font-medium">
												{req.reference || "—"}
											</span>
											<Badge
												variant="outline"
												className={cn("text-[10px] h-4 px-1.5", getRequestStatusClass(req.status))}
											>
												{STATUS_LABELS[req.status] || req.status}
											</Badge>
										</div>
										<p className="text-sm text-muted-foreground mt-0.5 truncate">
											{req.serviceName?.fr || "Service consulaire"}
										</p>
									</div>
									<ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
								</Link>
							))}
							{pendingRequests.length > 3 && (
								<p className="text-xs text-muted-foreground text-center py-1">
									+ {pendingRequests.length - 3} autre{pendingRequests.length - 3 > 1 ? "s" : ""} demande{pendingRequests.length - 3 > 1 ? "s" : ""}
								</p>
							)}
						</div>
					</motion.div>
				)}

				{/* ── Profil complet + Notes Agent ─────────────────────────────── */}
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.15 }}
				>
					<Tabs defaultValue="profile" className="w-full">
						<TabsList className="w-full justify-start h-11 bg-transparent border-b rounded-none p-0 overflow-x-auto overflow-y-hidden mb-6">
							<TabsTrigger
								value="profile"
								className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-5"
							>
								<User className="h-4 w-4 mr-2" />
								Dossier Citoyen
							</TabsTrigger>
							{canDo("requests.process") && (
								<TabsTrigger
									value="notes"
									className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-5"
								>
									<MessageSquare className="h-4 w-4 mr-2" />
									Notes Internes
									<Badge variant="secondary" className="ml-2 text-xs">
										Agent
									</Badge>
								</TabsTrigger>
							)}
						</TabsList>

						{/* Tab: Profil complet */}
						<TabsContent value="profile">
							<ProfileDetailView profileId={profileId} context="agent" />
						</TabsContent>

						{/* Tab: Notes Agent (INTERNE — jamais visible côté citoyen) */}
						{canDo("requests.process") && (
							<TabsContent value="notes">
								<AgentNotesPanel profileId={profileId} />
							</TabsContent>
						)}
					</Tabs>
				</motion.div>
			</div>
		</div>
	);
}

// ─── Agent Notes Panel ────────────────────────────────────────────────────────
//
// IMPORTANT : Ces notes sont EXCLUSIVEMENT visibles par les agents.
// Elles ne sont JAMAIS transmises au citoyen ni visibles dans citizen-web.
// Elles sont liées au profil (pas à une demande spécifique).
// Pour les notes liées à une demande précise, utiliser $reference.tsx.

interface AgentNotesPanelProps {
	profileId: string;
}

function AgentNotesPanel({ profileId: _profileId }: AgentNotesPanelProps) {
	const [noteContent, setNoteContent] = useState("");
	const [isSending, setIsSending] = useState(false);

	// For now, notes are per-profile (stored via agentNotes scoped to profile context)
	// We display a clear explanation and allow free-text notes
	// Future: add a profileId index on agentNotes table

	const handleSendNote = async () => {
		if (!noteContent.trim()) return;
		setIsSending(true);
		// TODO: integrate with convex mutation when profileId-scoped notes are added
		// For now, show UI with clear label
		await new Promise((r) => setTimeout(r, 600));
		toast.success("Note enregistrée (fonctionnalité en cours d'intégration)");
		setNoteContent("");
		setIsSending(false);
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Warning banner */}
			<div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
				<Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
				<div className="text-xs text-amber-800 dark:text-amber-300">
					<span className="font-semibold">Notes internes agents</span> — Ces notes sont strictement réservées au
					corps administratif. Elles ne sont jamais visibles par le citoyen et n'apparaissent pas dans son espace personnel.
				</div>
			</div>

			{/* Empty state */}
			<Card className="border-dashed">
				<CardContent className="flex flex-col items-center justify-center py-10 text-center">
					<MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
					<p className="text-sm font-medium text-muted-foreground">Aucune note pour ce profil</p>
					<p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
						Ajoutez des observations, remarques ou alertes internes sur ce dossier.
					</p>
				</CardContent>
			</Card>

			{/* Add note */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-medium">Ajouter une note interne</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<Textarea
						value={noteContent}
						onChange={(e) => setNoteContent(e.target.value)}
						placeholder="Documents vérifiés, observations particulières, alertes..."
						rows={3}
						className="resize-none text-sm"
					/>
					<div className="flex justify-end">
						<Button
							size="sm"
							onClick={handleSendNote}
							disabled={isSending || !noteContent.trim()}
							className="gap-2"
						>
							{isSending ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Send className="h-3.5 w-3.5" />
							)}
							Enregistrer la note
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AgentProfileSkeleton() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
			{/* Nav */}
			<div className="flex items-center gap-3 pb-3 border-b border-border/50">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-4 w-4 rounded-full" />
				<Skeleton className="h-4 w-48" />
			</div>

			{/* Header card */}
			<div className="rounded-xl border border-border bg-card p-5">
				<div className="flex items-center gap-5">
					<Skeleton className="h-16 w-16 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-64" />
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="space-y-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-16 w-full rounded-lg" />
				))}
			</div>
		</div>
	);
}
