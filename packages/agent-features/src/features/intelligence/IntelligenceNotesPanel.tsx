"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Flag, Loader2, Send, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { FlatCard } from "../../components/my-space/flat-card";
import { useOrg } from "../../shell/org-provider";

type IntelTargetType = "profile" | "child_profile" | "diplomatic_target" | "agent";
type IntelCategory = "observation" | "risk" | "flag" | "lead";
type IntelSeverity = "low" | "medium" | "high" | "critical";
type IntelSource = "humint" | "osint" | "internal" | "tip" | "other";
type IntelClassification = "internal" | "restricted" | "secret" | "top_secret";
type IntelVerified = "unverified" | "confirmed" | "disputed";

const SOURCE_LABELS: Record<IntelSource, string> = {
	humint: "HUMINT",
	osint: "OSINT",
	internal: "Interne",
	tip: "Signalement",
	other: "Autre",
};

const CLASSIFICATION_LABELS: Record<IntelClassification, string> = {
	internal: "Interne",
	restricted: "Restreint",
	secret: "Secret",
	top_secret: "Très Secret",
};

const CLASSIFICATION_CLASSES: Record<IntelClassification, string> = {
	internal: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
	restricted: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
	secret: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
	top_secret: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

const VERIFIED_LABELS: Record<IntelVerified, string> = {
	unverified: "Non vérifié",
	confirmed: "Confirmé",
	disputed: "Contesté",
};

const SEVERITY_LABELS: Record<IntelSeverity, string> = {
	low: "Faible",
	medium: "Moyen",
	high: "Élevé",
	critical: "Critique",
};

const SEVERITY_CLASSES: Record<IntelSeverity, string> = {
	low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
	medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
	high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
	critical: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

const CATEGORY_LABELS: Record<IntelCategory, string> = {
	observation: "Observation",
	risk: "Risque",
	flag: "Signalement",
	lead: "Piste",
};

const CATEGORY_ICONS: Record<IntelCategory, React.ElementType> = {
	observation: Target,
	risk: AlertTriangle,
	flag: Flag,
	lead: Target,
};

interface IntelligenceNotesPanelProps {
	targetType: IntelTargetType;
	targetId: string;
}

export function IntelligenceNotesPanel({
	targetType,
	targetId,
}: IntelligenceNotesPanelProps) {
	const { activeOrgId } = useOrg();
	const [content, setContent] = useState("");
	const [category, setCategory] = useState<IntelCategory>("observation");
	const [severity, setSeverity] = useState<IntelSeverity>("medium");
	const [source, setSource] = useState<IntelSource>("humint");
	const [classification, setClassification] = useState<IntelClassification>("internal");
	const [verified, setVerified] = useState<IntelVerified>("unverified");

	const { data: me } = useAuthenticatedConvexQuery(
		api.functions.users.getMe,
		{},
	);

	const { data: notes, isLoading } = useAuthenticatedConvexQuery(
		api.functions.intelligenceNotes.listByTarget,
		activeOrgId
			? { targetType, targetId, orgId: activeOrgId }
			: "skip",
	);

	const { mutateAsync: addNote, isPending: isSending } = useConvexMutationQuery(
		api.functions.intelligenceNotes.create,
	);
	const { mutateAsync: deleteNote } = useConvexMutationQuery(
		api.functions.intelligenceNotes.remove,
	);

	const handleSend = async () => {
		const trimmed = content.trim();
		if (!trimmed || !activeOrgId) return;
		try {
			await addNote({
				targetType,
				targetId,
				orgId: activeOrgId,
				content: trimmed,
				category,
				severity,
				source,
				classification,
				verified,
			});
			setContent("");
			toast.success("Note enregistrée");
		} catch (_e) {
			toast.error("Impossible d'enregistrer la note");
		}
	};

	const handleDelete = async (noteId: Id<"intelligenceNotes">) => {
		if (!activeOrgId) return;
		try {
			await deleteNote({ noteId, orgId: activeOrgId });
			toast.success("Note supprimée");
		} catch (_e) {
			toast.error("Impossible de supprimer la note");
		}
	};

	return (
		<FlatCard className="p-4 space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold flex items-center gap-2">
					<AlertTriangle className="h-4 w-4 text-rose-500" />
					Notes Renseignement
				</h3>
				<Badge variant="outline" className="text-xs">
					Cloisonné — Intelligence uniquement
				</Badge>
			</div>

			<div className="space-y-2 rounded-md border border-foreground/5 p-3">
				<Textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="Ajouter une note confidentielle…"
					rows={3}
					className="resize-none"
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Select value={category} onValueChange={(v) => setCategory(v as IntelCategory)}>
						<SelectTrigger className="h-8 w-32 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(CATEGORY_LABELS) as IntelCategory[]).map((c) => (
								<SelectItem key={c} value={c} className="text-xs">
									{CATEGORY_LABELS[c]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={severity} onValueChange={(v) => setSeverity(v as IntelSeverity)}>
						<SelectTrigger className="h-8 w-28 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(SEVERITY_LABELS) as IntelSeverity[]).map((s) => (
								<SelectItem key={s} value={s} className="text-xs">
									{SEVERITY_LABELS[s]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={source} onValueChange={(v) => setSource(v as IntelSource)}>
						<SelectTrigger className="h-8 w-28 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(SOURCE_LABELS) as IntelSource[]).map((s) => (
								<SelectItem key={s} value={s} className="text-xs">
									{SOURCE_LABELS[s]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={classification}
						onValueChange={(v) => setClassification(v as IntelClassification)}
					>
						<SelectTrigger className="h-8 w-32 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(CLASSIFICATION_LABELS) as IntelClassification[]).map(
								(c) => (
									<SelectItem key={c} value={c} className="text-xs">
										{CLASSIFICATION_LABELS[c]}
									</SelectItem>
								),
							)}
						</SelectContent>
					</Select>
					<Select value={verified} onValueChange={(v) => setVerified(v as IntelVerified)}>
						<SelectTrigger className="h-8 w-32 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(VERIFIED_LABELS) as IntelVerified[]).map((v) => (
								<SelectItem key={v} value={v} className="text-xs">
									{VERIFIED_LABELS[v]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						size="sm"
						onClick={handleSend}
						disabled={!content.trim() || isSending}
						className="ml-auto"
					>
						{isSending ? (
							<Loader2 className="h-3 w-3 animate-spin" />
						) : (
							<Send className="h-3 w-3" />
						)}
						Enregistrer
					</Button>
				</div>
			</div>

			<div className="space-y-2">
				{isLoading ? (
					<>
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</>
				) : !notes?.length ? (
					<p className="text-xs text-muted-foreground py-4 text-center">
						Aucune note pour ce profil.
					</p>
				) : (
					notes.map((n) => {
						const Icon = CATEGORY_ICONS[n.category];
						const isOwn = me?._id === n.authorId;
						return (
							<div
								key={n._id}
								className="rounded-md border border-foreground/5 p-3 space-y-1.5"
							>
								<div className="flex items-center gap-2 text-xs flex-wrap">
									<Icon className="h-3 w-3" />
									<span className="font-medium">{CATEGORY_LABELS[n.category]}</span>
									<span
										className={cn(
											"px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
											SEVERITY_CLASSES[n.severity],
										)}
									>
										{SEVERITY_LABELS[n.severity]}
									</span>
									{n.classification && (
										<span
											className={cn(
												"px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
												CLASSIFICATION_CLASSES[n.classification as IntelClassification],
											)}
										>
											{CLASSIFICATION_LABELS[n.classification as IntelClassification]}
										</span>
									)}
									{n.source && (
										<span className="px-1.5 py-0.5 rounded bg-foreground/5 text-[10px] uppercase tracking-wide">
											{SOURCE_LABELS[n.source as IntelSource]}
										</span>
									)}
									{n.verified && n.verified !== "unverified" && (
										<span
											className={cn(
												"px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
												n.verified === "confirmed"
													? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
													: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
											)}
										>
											{VERIFIED_LABELS[n.verified as IntelVerified]}
										</span>
									)}
									<span className="ml-auto text-muted-foreground">
										{n.author
											? `${n.author.firstName ?? ""} ${n.author.lastName ?? ""}`.trim() || "Agent"
											: "Agent inconnu"}
										{" · "}
										{formatDistanceToNow(n._creationTime, {
											addSuffix: true,
											locale: fr,
										})}
									</span>
									{isOwn && (
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0"
											onClick={() => handleDelete(n._id)}
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									)}
								</div>
								<p className="text-sm whitespace-pre-wrap">{n.content}</p>
							</div>
						);
					})
				)}
			</div>
		</FlatCard>
	);
}
