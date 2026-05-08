"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
	AlertTriangle,
	Eye,
	Flag,
	Loader2,
	Send,
	StickyNote,
	Target,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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

const SEVERITY_LABELS: Record<IntelSeverity, string> = {
	low: "Faible",
	medium: "Moyen",
	high: "Élevé",
	critical: "Critique",
};

const SEVERITY_CLASSES: Record<IntelSeverity, string> = {
	low: "bg-muted/50 text-muted-foreground border-border/50",
	medium:
		"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
	high:
		"bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
	critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const CATEGORY_LABELS: Record<IntelCategory, string> = {
	observation: "Observation",
	risk: "Risque",
	flag: "Signalement",
	lead: "Piste",
};

const CATEGORY_ICONS: Record<IntelCategory, React.ElementType> = {
	observation: Eye,
	risk: AlertTriangle,
	flag: Flag,
	lead: Target,
};

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
	internal: "bg-muted/50 text-muted-foreground border-border/50",
	restricted: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
	secret:
		"bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
	top_secret: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const VERIFIED_LABELS: Record<IntelVerified, string> = {
	unverified: "Non vérifié",
	confirmed: "Confirmé",
	disputed: "Contesté",
};

const VERIFIED_CLASSES: Record<IntelVerified, string> = {
	unverified: "bg-muted/50 text-muted-foreground border-border/50",
	confirmed:
		"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
	disputed:
		"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

interface IntelligenceNotesPanelProps {
	targetType: IntelTargetType;
	targetId: string;
}

function NoteFieldGroup({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			{children}
		</div>
	);
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
	const [classification, setClassification] =
		useState<IntelClassification>("internal");
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
		<FlatCard>
			<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
				<div className="rounded-md bg-rose-500/10 p-1.5">
					<StickyNote className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
				</div>
				<span className="text-base font-bold flex-1">Notes Renseignement</span>
				<Badge
					variant="outline"
					className="text-[10px] h-5 px-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
				>
					Cloisonné
				</Badge>
			</div>

			<div className="p-4 space-y-4">
				{/* Composer */}
				<div className="space-y-3 rounded-lg bg-muted/30 p-4 border border-border/30">
					<div className="space-y-1.5">
						<label
							htmlFor="intel-note-content"
							className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
						>
							Note confidentielle
						</label>
						<Textarea
							id="intel-note-content"
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder="Décrivez l'observation, le risque ou la piste…"
							rows={3}
							className="resize-none border-border/50 bg-background"
						/>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
						<NoteFieldGroup label="Catégorie">
							<Select
								value={category}
								onValueChange={(v) => setCategory(v as IntelCategory)}
							>
								<SelectTrigger className="h-9 text-xs w-full">
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
						</NoteFieldGroup>

						<NoteFieldGroup label="Sévérité">
							<Select
								value={severity}
								onValueChange={(v) => setSeverity(v as IntelSeverity)}
							>
								<SelectTrigger className="h-9 text-xs w-full">
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
						</NoteFieldGroup>

						<NoteFieldGroup label="Source">
							<Select
								value={source}
								onValueChange={(v) => setSource(v as IntelSource)}
							>
								<SelectTrigger className="h-9 text-xs w-full">
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
						</NoteFieldGroup>

						<NoteFieldGroup label="Classification">
							<Select
								value={classification}
								onValueChange={(v) => setClassification(v as IntelClassification)}
							>
								<SelectTrigger className="h-9 text-xs w-full">
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
						</NoteFieldGroup>

						<NoteFieldGroup label="Vérification">
							<Select
								value={verified}
								onValueChange={(v) => setVerified(v as IntelVerified)}
							>
								<SelectTrigger className="h-9 text-xs w-full">
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
						</NoteFieldGroup>
					</div>

					<div className="flex justify-end pt-1">
						<Button
							size="sm"
							onClick={handleSend}
							disabled={!content.trim() || isSending}
						>
							{isSending ? (
								<Loader2 className="h-3 w-3 animate-spin mr-1" />
							) : (
								<Send className="h-3 w-3 mr-1" />
							)}
							Enregistrer
						</Button>
					</div>
				</div>

				{/* Notes list */}
				<div className="space-y-2">
					{isLoading ? (
						<>
							<Skeleton className="h-20 w-full rounded-lg" />
							<Skeleton className="h-20 w-full rounded-lg" />
						</>
					) : !notes?.length ? (
						<p className="text-xs text-muted-foreground py-6 text-center">
							Aucune note pour cette cible.
						</p>
					) : (
						<AnimatePresence mode="popLayout">
							{notes.map((n) => {
								const Icon = CATEGORY_ICONS[n.category];
								const isOwn = me?._id === n.authorId;
								return (
									<motion.div
										key={n._id}
										layout
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: 4 }}
										className="rounded-lg border border-border/50 bg-background/60 p-3 space-y-2"
									>
										<div className="flex items-center gap-1.5 flex-wrap">
											<Icon className="h-3 w-3 text-muted-foreground" />
											<span className="text-xs font-medium">
												{CATEGORY_LABELS[n.category]}
											</span>
											<Badge
												variant="outline"
												className={cn(
													"text-[10px] h-4 px-1.5",
													SEVERITY_CLASSES[n.severity],
												)}
											>
												{SEVERITY_LABELS[n.severity]}
											</Badge>
											{n.classification && (
												<Badge
													variant="outline"
													className={cn(
														"text-[10px] h-4 px-1.5",
														CLASSIFICATION_CLASSES[n.classification as IntelClassification],
													)}
												>
													{CLASSIFICATION_LABELS[n.classification as IntelClassification]}
												</Badge>
											)}
											{n.source && (
												<Badge
													variant="outline"
													className="text-[10px] h-4 px-1.5 bg-muted/50 text-muted-foreground border-border/50"
												>
													{SOURCE_LABELS[n.source as IntelSource]}
												</Badge>
											)}
											{n.verified && n.verified !== "unverified" && (
												<Badge
													variant="outline"
													className={cn(
														"text-[10px] h-4 px-1.5",
														VERIFIED_CLASSES[n.verified as IntelVerified],
													)}
												>
													{VERIFIED_LABELS[n.verified as IntelVerified]}
												</Badge>
											)}
										</div>

										<p className="text-sm whitespace-pre-wrap">{n.content}</p>

										<div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px] text-muted-foreground">
											<span>
												{n.author
													? `${n.author.firstName ?? ""} ${n.author.lastName ?? ""}`.trim() ||
														"Agent"
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
									</motion.div>
								);
							})}
						</AnimatePresence>
					)}
				</div>
			</div>
		</FlatCard>
	);
}
