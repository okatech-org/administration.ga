"use client";

/**
 * Detail d'un dossier de demarche
 *
 * Vue complete d'un dossier : en-tete, progression des etapes,
 * checklist des pieces, timeline des transitions, et alertes.
 */

import { useRouter, useParams } from "next/navigation";
import {
	AlertTriangle,
	ArrowLeft,
	CalendarClock,
	Check,
	CheckCircle,
	Circle,
	Clock,
	Download,
	FileText,
	FolderOpen,
	Loader2,
	Upload,
	XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/my-space/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	useAuthenticatedConvexQuery,
	useConvexMutation,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

// --- Status config ---

type DossierStatus =
	| "brouillon"
	| "en_cours"
	| "en_attente"
	| "suspendu"
	| "valide"
	| "rejete"
	| "clos"
	| "archive";

const statusConfig: Record<
	DossierStatus,
	{ label: string; color: string; bgColor: string }
> = {
	brouillon: {
		label: "Brouillon",
		color: "text-zinc-600 dark:text-zinc-400",
		bgColor: "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
	},
	en_cours: {
		label: "En cours",
		color: "text-blue-600 dark:text-blue-400",
		bgColor: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
	},
	en_attente: {
		label: "En attente",
		color: "text-amber-600 dark:text-amber-400",
		bgColor: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
	},
	suspendu: {
		label: "Suspendu",
		color: "text-orange-600 dark:text-orange-400",
		bgColor:
			"bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
	},
	valide: {
		label: "Valide",
		color: "text-emerald-600 dark:text-emerald-400",
		bgColor:
			"bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800",
	},
	rejete: {
		label: "Rejete",
		color: "text-red-600 dark:text-red-400",
		bgColor: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
	},
	clos: {
		label: "Clos",
		color: "text-zinc-600 dark:text-zinc-400",
		bgColor: "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
	},
	archive: {
		label: "Archive",
		color: "text-violet-600 dark:text-violet-400",
		bgColor:
			"bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800",
	},
};

const pieceStatusConfig: Record<
	string,
	{ label: string; color: string; icon: React.ReactNode }
> = {
	manquant: {
		label: "Manquant",
		color: "text-amber-500",
		icon: <Circle className="w-4 h-4" />,
	},
	fourni: {
		label: "Fourni",
		color: "text-blue-500",
		icon: <Clock className="w-4 h-4" />,
	},
	valide: {
		label: "Valide",
		color: "text-emerald-500",
		icon: <CheckCircle className="w-4 h-4" />,
	},
	rejete: {
		label: "Rejete",
		color: "text-red-500",
		icon: <XCircle className="w-4 h-4" />,
	},
	signe: {
		label: "Signe",
		color: "text-emerald-600",
		icon: <Check className="w-4 h-4" />,
	},
};

// --- Helpers ---

function formatDateFr(ts: number): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(ts));
}

function formatDateTimeFr(ts: number): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(ts));
}

const actionLabels: Record<string, string> = {
	creer: "Creation",
	soumettre: "Soumission",
	avancer: "Avancement",
	renvoyer: "Renvoi",
	suspendre: "Suspension",
	reprendre: "Reprise",
	clore: "Cloture",
	valider: "Validation",
	rejeter: "Rejet",
};

// --- Upload Component ---

function PieceUploadButton({
	dossierId,
	pieceCode,
}: {
	dossierId: Id<"dossierProcedures">;
	pieceCode: string;
}) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const generateUploadUrl = useConvexMutation(
		api.functions.dossierProcedure.generateUploadUrl,
	);
	const uploadPiece = useConvexMutation(
		api.functions.dossierProcedure.uploadPiece,
	);

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploading(true);
		try {
			// 1) Get the upload URL
			const uploadUrl = await generateUploadUrl({});

			// 2) Upload the file
			const result = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});

			if (!result.ok) throw new Error("Upload failed");

			const { storageId } = await result.json();

			// 3) Link the file to the piece
			await uploadPiece({
				dossierId,
				pieceCode,
				storageId,
				filename: file.name,
				mimeType: file.type,
				sizeBytes: file.size,
			});

			toast.success("Document envoye avec succes");
		} catch (err) {
			console.error(err);
			toast.error("Erreur lors de l'envoi du document");
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	return (
		<>
			<input
				type="file"
				ref={fileInputRef}
				onChange={handleUpload}
				className="hidden"
				accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
			/>
			<Button
				variant="outline"
				size="sm"
				className="h-7 text-xs gap-1.5 rounded-lg"
				onClick={() => fileInputRef.current?.click()}
				disabled={uploading}
			>
				{uploading ? (
					<Loader2 className="w-3 h-3 animate-spin" />
				) : (
					<Upload className="w-3 h-3" />
				)}
				{uploading ? "Envoi..." : "Envoyer"}
			</Button>
		</>
	);
}

// --- Main Component ---

export default function DossierDetailPage() {
	const router = useRouter();
	const params = useParams<{ dossierId: string }>();
	const dossierId = params.dossierId;

	const dossier = useAuthenticatedConvexQuery(
		api.functions.dossierProcedure.getDossier,
		{ dossierId: dossierId as Id<"dossierProcedures"> },
	);

	const transitions = useAuthenticatedConvexQuery(
		api.functions.dossierProcedure.getTransitions,
		{ dossierId: dossierId as Id<"dossierProcedures"> },
	);

	if (dossier === undefined) {
		return (
			<div className="h-full flex items-center justify-center">
				<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (dossier === null) {
		return (
			<div className="h-full flex flex-col items-center justify-center gap-4">
				<p className="text-sm text-muted-foreground">Dossier introuvable</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => router.push("/my-space/demarches")}
				>
					Retour aux demarches
				</Button>
			</div>
		);
	}

	const status = dossier.status as DossierStatus;
	const config = statusConfig[status];
	const steps = dossier.typeDemarche?.etapesParcours
		? [...dossier.typeDemarche.etapesParcours].sort(
				(a: any, b: any) => a.ordre - b.ordre,
			)
		: [];
	const currentStepOrdre = dossier.etapeCouranteOrdre ?? 0;
	const rejectedPieces = (dossier.pieces ?? []).filter(
		(p: any) => p.status === "rejete",
	);

	return (
		<div className="h-full flex flex-col bg-background">
			{/* Header */}
			<div className="p-4 pb-0">
				<PageHeader
					title={dossier.typeDemarche?.label?.fr ?? "Demarche"}
					subtitle={
						<div className="flex items-center gap-2 flex-wrap">
							<span className="font-mono text-xs">{dossier.reference}</span>
							<Badge
								variant="outline"
								className={cn(
									"text-[10px] border px-1.5 py-0",
									config.bgColor,
									config.color,
								)}
							>
								{config.label}
							</Badge>
						</div>
					}
					icon={<FolderOpen className="text-primary" size={24} />}
					showBackButton
					onBack={() => router.push("/my-space/demarches")}
				/>
			</div>

			<div className="flex-1 p-4 overflow-y-auto space-y-4">
				{/* Rejected pieces alert */}
				{rejectedPieces.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<Card className="p-3 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 rounded-xl">
							<div className="flex items-start gap-2">
								<AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
								<div>
									<p className="text-xs font-semibold text-red-600 dark:text-red-400">
										{rejectedPieces.length} document
										{rejectedPieces.length > 1 ? "s" : ""} rejete
										{rejectedPieces.length > 1 ? "s" : ""}
									</p>
									<p className="text-xs text-red-500/80 dark:text-red-400/80 mt-0.5">
										Veuillez renvoyer les documents concernes pour continuer
										votre demarche.
									</p>
								</div>
							</div>
						</Card>
					</motion.div>
				)}

				{/* Dates info */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.05 }}
				>
					<Card className="p-4 bg-card border-border/50 rounded-xl">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div>
								<p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
									Date de depot
								</p>
								<div className="flex items-center gap-1 text-sm">
									<CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
									{formatDateFr(dossier.dateDepot)}
								</div>
							</div>
							{dossier.dateLimite && (
								<div>
									<p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
										Date limite
									</p>
									<div className="flex items-center gap-1 text-sm">
										<Clock className="w-3.5 h-3.5 text-muted-foreground" />
										{formatDateFr(dossier.dateLimite)}
									</div>
								</div>
							)}
							{dossier.demandeur && (
								<div>
									<p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
										Demandeur
									</p>
									<p className="text-sm">{dossier.demandeur.name}</p>
								</div>
							)}
							{dossier.agentTraitant && (
								<div>
									<p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
										Agent traitant
									</p>
									<p className="text-sm">{dossier.agentTraitant.name}</p>
								</div>
							)}
						</div>
					</Card>
				</motion.div>

				{/* Step progress tracker */}
				{steps.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
					>
						<Card className="p-4 bg-card border-border/50 rounded-xl">
							<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
								Progression
							</h3>
							<div className="flex items-center gap-0 overflow-x-auto pb-2">
								{steps.map((step: any, index: number) => {
									const isCompleted = step.ordre < currentStepOrdre;
									const isCurrent = step.code === dossier.etapeCouranteCode;
									const isFuture = step.ordre > currentStepOrdre;

									return (
										<div
											key={step.code}
											className="flex items-center flex-shrink-0"
										>
											{/* Step node */}
											<div className="flex flex-col items-center gap-1.5">
												<div
													className={cn(
														"w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
														isCompleted &&
															"bg-emerald-500 border-emerald-500 text-white",
														isCurrent &&
															"bg-blue-500 border-blue-500 text-white ring-4 ring-blue-500/20",
														isFuture &&
															"bg-muted border-border text-muted-foreground",
													)}
												>
													{isCompleted ? (
														<Check className="w-4 h-4" />
													) : (
														<span className="text-xs font-semibold">
															{index + 1}
														</span>
													)}
												</div>
												<span
													className={cn(
														"text-[10px] font-medium text-center max-w-[80px] leading-tight",
														isCurrent
															? "text-blue-600 dark:text-blue-400"
															: "text-muted-foreground",
													)}
												>
													{step.label?.fr ?? step.code}
												</span>
											</div>
											{/* Connector */}
											{index < steps.length - 1 && (
												<div
													className={cn(
														"h-0.5 w-8 md:w-12 mx-1 rounded-full",
														isCompleted
															? "bg-emerald-500"
															: "bg-border",
													)}
												/>
											)}
										</div>
									);
								})}
							</div>
						</Card>
					</motion.div>
				)}

				{/* Pieces checklist */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.15 }}
				>
					<Card className="p-4 bg-card border-border/50 rounded-xl">
						<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
							Documents requis
						</h3>
						<div className="space-y-2">
							{(dossier.pieces ?? []).length === 0 ? (
								<p className="text-xs text-muted-foreground">
									Aucun document requis
								</p>
							) : (
								(dossier.pieces as any[]).map((piece: any) => {
									const pConfig =
										pieceStatusConfig[piece.status] ??
										pieceStatusConfig.manquant;
									const canUpload =
										piece.status === "manquant" ||
										piece.status === "rejete";

									return (
										<div
											key={piece._id}
											className={cn(
												"flex items-center justify-between gap-3 p-3 rounded-lg border",
												piece.status === "rejete"
													? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"
													: "border-border/50 bg-muted/20",
											)}
										>
											<div className="flex items-center gap-2 flex-1 min-w-0">
												<div className={pConfig.color}>{pConfig.icon}</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium truncate">
														{piece.label?.fr ?? piece.pieceCode}
													</p>
													<div className="flex items-center gap-2 mt-0.5">
														<span
															className={cn(
																"text-xs",
																pConfig.color,
															)}
														>
															{pConfig.label}
														</span>
														{piece.required && (
															<span className="text-[10px] text-red-400">
																Obligatoire
															</span>
														)}
													</div>
													{piece.status === "rejete" &&
														piece.rejectionReason && (
															<p className="text-xs text-red-500 mt-1">
																Motif : {piece.rejectionReason}
															</p>
														)}
													{piece.filename && (
														<p className="text-[10px] text-muted-foreground mt-0.5 truncate">
															{piece.filename}
														</p>
													)}
												</div>
											</div>
											<div className="flex items-center gap-2 flex-shrink-0">
												{piece.url && (
													<a
														href={piece.url}
														target="_blank"
														rel="noopener noreferrer"
													>
														<Button
															variant="ghost"
															size="sm"
															className="h-7 w-7 p-0"
														>
															<Download className="w-3.5 h-3.5" />
														</Button>
													</a>
												)}
												{canUpload && (
													<PieceUploadButton
														dossierId={
															dossier._id as Id<"dossierProcedures">
														}
														pieceCode={piece.pieceCode}
													/>
												)}
											</div>
										</div>
									);
								})
							)}
						</div>
					</Card>
				</motion.div>

				{/* Timeline */}
				{transitions && (transitions as any[]).length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
					>
						<Card className="p-4 bg-card border-border/50 rounded-xl">
							<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
								Historique
							</h3>
							<div className="relative">
								{/* Vertical line */}
								<div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
								<div className="space-y-4">
									{(transitions as any[]).map(
										(tr: any, index: number) => (
											<div
												key={tr._id ?? index}
												className="flex items-start gap-3 relative"
											>
												<div className="w-6 h-6 rounded-full bg-muted border-2 border-border flex items-center justify-center flex-shrink-0 z-10">
													<div className="w-2 h-2 rounded-full bg-foreground/30" />
												</div>
												<div className="flex-1 pb-1">
													<div className="flex items-center gap-2">
														<span className="text-xs font-semibold">
															{actionLabels[tr.action] ??
																tr.action}
														</span>
														<span className="text-[10px] text-muted-foreground">
															{formatDateTimeFr(tr.createdAt)}
														</span>
													</div>
													{tr.commentaire && (
														<p className="text-xs text-muted-foreground mt-0.5">
															{tr.commentaire}
														</p>
													)}
													<p className="text-[10px] text-muted-foreground/70 mt-0.5">
														Par {tr.actorName}
													</p>
												</div>
											</div>
										),
									)}
								</div>
							</div>
						</Card>
					</motion.div>
				)}
			</div>
		</div>
	);
}
