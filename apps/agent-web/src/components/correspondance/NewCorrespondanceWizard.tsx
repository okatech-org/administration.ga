/**
 * NewCorrespondanceWizard — 3-step wizard modal for creating a new correspondance.
 * Steps: 1) Informations → 2) Documents → 3) Envoi
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import {
	Mail,
	ArrowLeft,
	ArrowRight,
	CheckCircle2,
	Send,
	Save,
	Loader2,
	X,
	User,
	Building2,
} from "lucide-react";
import { RecipientPicker } from "./RecipientPicker";
import type { Recipient } from "./RecipientPicker";
import { AttachmentUploader } from "./AttachmentUploader";
import type { UploadedAttachment } from "./AttachmentUploader";

// ─── Constants ───────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
	note_verbale: "Note Verbale",
	lettre_officielle: "Lettre Officielle",
	circulaire: "Circulaire",
	telegramme: "Télégramme",
	memorandum: "Mémorandum",
	communique: "Communiqué",
};

const PRIORITY_LABELS: Record<string, string> = {
	normal: "Normal",
	urgent: "Urgent",
	confidentiel: "Confidentiel",
};

const STEP_LABELS = ["1. Informations", "2. Documents", "3. Envoi"];

// ─── Props ───────────────────────────────────────────────────

interface NewCorrespondanceWizardProps {
	open: boolean;
	onClose: () => void;
	orgId: string; // active org ID, typed as Id<"orgs"> internally
}

// ─── Component ───────────────────────────────────────────────

export function NewCorrespondanceWizard({
	open,
	onClose,
	orgId,
}: NewCorrespondanceWizardProps) {
	// ─── Step ──────────────────────────────────────────────
	const [step, setStep] = useState(0); // 0, 1, 2

	// ─── Step 0: Metadata ──────────────────────────────────
	const [title, setTitle] = useState("");
	const [type, setType] = useState<string>("lettre_officielle");
	const [priority, setPriority] = useState<string>("normal");
	const [comment, setComment] = useState("");
	const [recipients, setRecipients] = useState<Recipient[]>([]);

	// ─── Step 1: Attachments ───────────────────────────────
	const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
	const [showAttachError, setShowAttachError] = useState(false);

	// ─── Submission ────────────────────────────────────────
	const [isSubmitting, setIsSubmitting] = useState(false);

	// ─── Queries & Mutations ───────────────────────────────
	const { data: senderInfo } = useAuthenticatedConvexQuery(
		api.functions.correspondance.getCurrentUserSenderInfo,
		{ orgId: orgId as Id<"orgs"> },
	);

	const generateUploadUrlMutation = useConvexMutationQuery(
		api.functions.correspondance.generateUploadUrl,
	);

	const createItemMutation = useConvexMutationQuery(
		api.functions.correspondance.createItem,
	);

	// ─── Handlers ──────────────────────────────────────────

	const handleGenerateUploadUrl = useCallback(async () => {
		const result = await generateUploadUrlMutation.mutateAsync({});
		return result as string;
	}, [generateUploadUrlMutation]);

	const canProceedStep0 = title.trim().length > 0 && recipients.length > 0;

	const handleNextStep = useCallback(() => {
		if (step === 0) {
			if (!canProceedStep0) return;
			setStep(1);
		} else if (step === 1) {
			if (attachments.length === 0) {
				setShowAttachError(true);
				return;
			}
			setShowAttachError(false);
			setStep(2);
		}
	}, [step, canProceedStep0, attachments.length]);

	const handlePrevStep = useCallback(() => {
		if (step > 0) {
			setStep(step - 1);
		} else {
			onClose();
		}
	}, [step, onClose]);

	const handleSubmit = useCallback(
		async (asDraft: boolean) => {
			if (!senderInfo) return;

			if (!asDraft && attachments.length === 0) {
				toast.error("Au moins un document PDF est requis");
				return;
			}

			setIsSubmitting(true);
			try {
				const primary = recipients[0];
				const cc = recipients.slice(1);

				await createItemMutation.mutateAsync({
					orgId: orgId as Id<"orgs">,
					title: title.trim(),
					type: type as any,
					priority: priority as any,
					senderName: senderInfo.name,
					senderOrg: senderInfo.orgName,
					senderEmail: senderInfo.email,
					senderUserId: senderInfo.userId as Id<"users">,
					recipientName: primary.name,
					recipientOrg: primary.orgName,
					recipientEmail: primary.email,
					primaryRecipientId: primary.userId as Id<"users">,
					primaryRecipientOrgId: primary.orgId as Id<"orgs">,
					ccRecipients: cc.map((r) => ({
						userId: r.userId as Id<"users">,
						orgId: r.orgId as Id<"orgs">,
						name: r.name,
						email: r.email,
						positionTitle: r.positionTitle,
						orgName: r.orgName,
					})),
					comment: comment.trim() || undefined,
					attachments: attachments.map((a) => ({
						storageId: a.storageId as Id<"_storage">,
						filename: a.filename,
						mimeType: a.mimeType,
						sizeBytes: a.sizeBytes,
						uploadedAt: a.uploadedAt,
					})),
					direction: "outgoing",
					confidentialite:
						priority === "confidentiel" ? "confidentiel" : "standard",
				});

				toast.success(
					asDraft ? "Brouillon enregistré" : "Correspondance envoyée",
				);
				onClose();
			} catch (e: any) {
				toast.error(e?.message ?? "Erreur lors de la création");
			} finally {
				setIsSubmitting(false);
			}
		},
		[
			senderInfo,
			attachments,
			recipients,
			createItemMutation,
			orgId,
			title,
			type,
			priority,
			comment,
			onClose,
		],
	);

	// ─── Early return ──────────────────────────────────────

	if (!open) return null;

	// ─── Render ────────────────────────────────────────────

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="w-full max-w-2xl border border-border/50 shadow-2xl bg-popover rounded-2xl max-h-[85vh] flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* ─── Header ─────────────────────────────────── */}
				<div className="px-5 pt-5 pb-3 border-b border-border/50 flex items-center justify-between shrink-0">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<Mail className="h-5 w-5 text-violet-400" />
						Nouvelle correspondance
					</div>
					<button
						onClick={onClose}
						className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* ─── Step indicators ─────────────────────────── */}
				<div className="px-5 py-3 border-b border-border/50 flex items-center gap-3 shrink-0">
					{STEP_LABELS.map((label, idx) => (
						<div key={label} className="flex items-center gap-2">
							{idx > 0 && <div className="h-px w-6 bg-border/50" />}
							<div
								className={cn(
									"flex items-center gap-1.5 text-xs",
									idx === step
										? "text-foreground font-medium"
										: idx < step
											? "text-emerald-400"
											: "text-muted-foreground/40",
								)}
							>
								<div
									className={cn(
										"h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
										idx === step
											? "bg-violet-500/20 border-violet-500 text-violet-400"
											: idx < step
												? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
												: "bg-muted/50 border-border/50 text-muted-foreground/40",
									)}
								>
									{idx < step ? (
										<CheckCircle2 className="h-3 w-3" />
									) : (
										idx + 1
									)}
								</div>
								{label}
							</div>
						</div>
					))}
				</div>

				{/* ─── Content ─────────────────────────────────── */}
				<div className="flex-1 overflow-y-auto p-5">
					{/* ── Step 0: Informations ─────────────────── */}
					{step === 0 && (
						<div className="space-y-4">
							{/* Sender info (read-only) */}
							<div className="space-y-1.5">
								<label className="text-xs font-medium">Expéditeur</label>
								<div className="rounded-lg border border-border/50 bg-muted/30 p-3">
									{senderInfo ? (
										<div className="flex items-start gap-3">
											<div className="h-9 w-9 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
												<User className="h-4 w-4 text-violet-400" />
											</div>
											<div className="min-w-0 space-y-0.5">
												<p className="text-xs font-bold">{senderInfo.name}</p>
												{senderInfo.positionTitle && (
													<p className="text-[11px] text-muted-foreground">
														{typeof senderInfo.positionTitle === "object" ? (senderInfo.positionTitle as any).fr : senderInfo.positionTitle}
													</p>
												)}
												<p className="text-[11px] text-muted-foreground flex items-center gap-1">
													<Building2 className="h-3 w-3" />
													{senderInfo.orgName}
												</p>
												<p className="text-[10px] text-muted-foreground/60">
													{senderInfo.email}
												</p>
											</div>
										</div>
									) : (
										<div className="flex items-center gap-2">
											<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
											<span className="text-xs text-muted-foreground">
												Chargement...
											</span>
										</div>
									)}
								</div>
							</div>

							{/* Title */}
							<div className="space-y-1.5">
								<label className="text-xs font-medium">
									Titre <span className="text-red-400">*</span>
								</label>
								<input
									type="text"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="Objet de la correspondance..."
									className="w-full h-9 px-3 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
								/>
							</div>

							{/* Type */}
							<div className="space-y-1.5">
								<label className="text-xs font-medium">Type</label>
								<select
									value={type}
									onChange={(e) => setType(e.target.value)}
									className="w-full h-9 px-3 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
								>
									{Object.entries(TYPE_LABELS).map(([value, label]) => (
										<option key={value} value={value}>
											{label}
										</option>
									))}
								</select>
							</div>

							{/* Priority */}
							<div className="space-y-1.5">
								<label className="text-xs font-medium">Priorité</label>
								<select
									value={priority}
									onChange={(e) => setPriority(e.target.value)}
									className="w-full h-9 px-3 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
								>
									{Object.entries(PRIORITY_LABELS).map(([value, label]) => (
										<option key={value} value={value}>
											{label}
										</option>
									))}
								</select>
							</div>

							{/* Recipients */}
							<div className="space-y-1.5">
								<label className="text-xs font-medium">
									Destinataires <span className="text-red-400">*</span>
								</label>
								<RecipientPicker
									selected={recipients}
									onChange={setRecipients}
									excludeUserId={senderInfo?.userId}
								/>
							</div>

							{/* Comment */}
							<div className="space-y-1.5">
								<label className="text-xs font-medium">Commentaire</label>
								<textarea
									rows={3}
									value={comment}
									onChange={(e) => setComment(e.target.value)}
									placeholder="Remarques ou instructions complémentaires..."
									className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
								/>
							</div>
						</div>
					)}

					{/* ── Step 1: Documents ────────────────────── */}
					{step === 1 && (
						<div className="space-y-4">
							<p className="text-xs text-muted-foreground">
								Joignez au moins un document PDF à votre correspondance.
							</p>
							<AttachmentUploader
								attachments={attachments}
								onAttachmentsChange={setAttachments}
								onGenerateUploadUrl={handleGenerateUploadUrl}
								showError={showAttachError}
							/>
						</div>
					)}

					{/* ── Step 2: Récapitulatif & Envoi ────────── */}
					{step === 2 && (
						<div className="space-y-4">
							<p className="text-xs text-muted-foreground">
								Vérifiez les informations avant d'envoyer.
							</p>

							<div className="border border-border/50 rounded-xl p-4 space-y-3 bg-card">
								{/* Sender */}
								{senderInfo && (
									<div>
										<p className="text-[9px] text-muted-foreground/60 uppercase">
											Expéditeur
										</p>
										<p className="text-xs font-medium">{senderInfo.name}</p>
										{senderInfo.positionTitle && (
											<p className="text-[11px] text-muted-foreground">
												{typeof senderInfo.positionTitle === "object" ? (senderInfo.positionTitle as any).fr : senderInfo.positionTitle}
											</p>
										)}
										<p className="text-[11px] text-muted-foreground">
											{senderInfo.orgName}
										</p>
									</div>
								)}

								{/* Metadata grid */}
								<div className="grid grid-cols-2 gap-3">
									<div>
										<p className="text-[9px] text-muted-foreground/60 uppercase">
											Titre
										</p>
										<p className="text-xs font-medium">{title}</p>
									</div>
									<div>
										<p className="text-[9px] text-muted-foreground/60 uppercase">
											Type
										</p>
										<p className="text-xs font-medium">
											{TYPE_LABELS[type] ?? type}
										</p>
									</div>
									<div>
										<p className="text-[9px] text-muted-foreground/60 uppercase">
											Priorité
										</p>
										<p className="text-xs font-medium capitalize">
											{PRIORITY_LABELS[priority] ?? priority}
										</p>
									</div>
								</div>

								{/* Primary recipient */}
								{recipients.length > 0 && (
									<div>
										<p className="text-[9px] text-muted-foreground/60 uppercase">
											Destinataire principal
										</p>
										<div className="flex items-center gap-2 mt-1">
											<p className="text-xs font-medium">
												{recipients[0].name}
											</p>
											<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">
												Titulaire
											</span>
										</div>
										<p className="text-[11px] text-muted-foreground">
											{recipients[0].orgName}
										</p>
									</div>
								)}

								{/* CC recipients */}
								{recipients.length > 1 && (
									<div>
										<p className="text-[9px] text-muted-foreground/60 uppercase">
											En copie
										</p>
										<div className="space-y-1 mt-1">
											{recipients.slice(1).map((r) => (
												<div
													key={r.userId}
													className="text-xs text-muted-foreground"
												>
													{r.name}{" "}
													<span className="text-muted-foreground/50">
														({r.orgName})
													</span>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Attachments */}
								<div>
									<p className="text-[9px] text-muted-foreground/60 uppercase">
										Documents joints ({attachments.length})
									</p>
									<div className="space-y-1 mt-1">
										{attachments.map((a) => (
											<div
												key={a.storageId}
												className="text-xs text-muted-foreground"
											>
												{a.filename}
											</div>
										))}
									</div>
								</div>

								{/* Comment */}
								{comment.trim() && (
									<div>
										<p className="text-[9px] text-muted-foreground/60 uppercase">
											Commentaire
										</p>
										<p className="text-xs text-muted-foreground mt-0.5">
											{comment}
										</p>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				{/* ─── Footer ─────────────────────────────────── */}
				<div className="px-5 py-3 border-t border-border/50 flex justify-between shrink-0">
					<button
						onClick={handlePrevStep}
						className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						{step > 0 ? "Précédent" : "Annuler"}
					</button>

					{step < 2 ? (
						<button
							onClick={handleNextStep}
							disabled={step === 0 && !canProceedStep0}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-indigo-600 to-violet-500 text-white disabled:opacity-50 transition-colors"
						>
							Suivant
							<ArrowRight className="h-3.5 w-3.5" />
						</button>
					) : (
						<div className="flex items-center gap-2">
							<button
								onClick={() => handleSubmit(true)}
								disabled={isSubmitting}
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
							>
								{isSubmitting ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<Save className="h-3.5 w-3.5" />
								)}
								Enregistrer brouillon
							</button>
							<button
								onClick={() => handleSubmit(false)}
								disabled={isSubmitting}
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r from-indigo-600 to-violet-500 text-white disabled:opacity-50 transition-colors"
							>
								{isSubmitting ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<Send className="h-3.5 w-3.5" />
								)}
								Envoyer
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
