/**
 * ApprovalPanel — Panneau d'approbation pour les correspondances en attente.
 *
 * Affiche la chaîne d'approbation et permet à l'approbateur courant
 * d'approuver ou de rejeter la correspondance.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Check, ChevronRight, Loader2, MessageSquare, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

interface ApprovalPanelProps {
	itemId: Id<"correspondanceItems">;
	currentUserId: string;
	status: string;
}

const STEP_STATUS_CFG: Record<string, { label: string; color: string; icon: typeof Check }> = {
	pending: { label: "En attente", color: "text-blue-400 bg-blue-500/15 border-blue-500/20", icon: Loader2 },
	approved: { label: "Approuvé", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20", icon: Check },
	rejected: { label: "Rejeté", color: "text-red-400 bg-red-500/15 border-red-500/20", icon: X },
	skipped: { label: "Passé", color: "text-zinc-400 bg-zinc-500/15 border-zinc-500/20", icon: ChevronRight },
};

export function ApprovalPanel({ itemId, currentUserId, status }: ApprovalPanelProps) {
	const [rejectOpen, setRejectOpen] = useState(false);
	const [rejectReason, setRejectReason] = useState("");
	const [approveComment, setApproveComment] = useState("");
	const [showCommentInput, setShowCommentInput] = useState(false);

	const { data: steps, isPending } = useAuthenticatedConvexQuery(
		api.functions.correspondance.getApprovalSteps,
		{ itemId },
	);

	const { mutateAsync: approveStep, isPending: isApproving } = useConvexMutationQuery(
		api.functions.correspondance.approveChainStep,
	);

	const { mutateAsync: rejectStep, isPending: isRejecting } = useConvexMutationQuery(
		api.functions.correspondance.rejectChainStep,
	);

	if (isPending) {
		return (
			<div className="flex items-center justify-center py-4">
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!steps || steps.length === 0) return null;

	const sortedSteps = [...steps].sort((a, b) => a.ordre - b.ordre);
	const myPendingStep = sortedSteps.find(
		(s) => s.approverId === currentUserId && s.status === "pending",
	);
	const isMyTurn = !!myPendingStep;

	const handleApprove = async () => {
		try {
			await approveStep({
				itemId,
				comment: approveComment.trim() || undefined,
			});
			toast.success("Correspondance approuvée ");
			setApproveComment("");
			setShowCommentInput(false);
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'approbation");
		}
	};

	const handleReject = async () => {
		if (!rejectReason.trim()) {
			toast.error("Veuillez indiquer un motif de rejet");
			return;
		}
		try {
			await rejectStep({
				itemId,
				reason: rejectReason.trim(),
			});
			toast.success("Correspondance rejetée");
			setRejectOpen(false);
			setRejectReason("");
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors du rejet");
		}
	};

	return (
		<div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
			{/* Header */}
			<div className="flex items-center gap-2">
				<ShieldCheck className="h-4 w-4 text-primary" />
				<h4 className="text-sm font-semibold text-primary">Chaîne d'approbation</h4>
				<Badge variant="outline" className="text-[9px] ml-auto">
					{sortedSteps.filter((s) => s.status === "approved").length}/{sortedSteps.length} étapes
				</Badge>
			</div>

			{/* Timeline des étapes */}
			<div className="space-y-1">
				{sortedSteps.map((step, i) => {
					const cfg = STEP_STATUS_CFG[step.status] ?? STEP_STATUS_CFG.pending;
					const isActive = step.status === "pending" && (i === 0 || sortedSteps[i - 1]?.status === "approved");
					const StepIcon = cfg.icon;
					return (
						<div
							key={step._id}
							className={cn(
								"flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
								isActive ? "bg-primary/10 border border-primary/20" : "bg-transparent",
							)}
						>
							{/* Dot/icon */}
							<div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0", cfg.color)}>
								<StepIcon className={cn("h-3.5 w-3.5", step.status === "pending" && isActive && "animate-spin")} />
							</div>

							{/* Info */}
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span className="text-xs font-medium">
										{step.approverName ?? "Approbateur"}
									</span>
									{step.approverRole && (
										<span className="text-[9px] text-muted-foreground capitalize">
											({step.approverRole})
										</span>
									)}
								</div>
								{step.comment && (
									<p className="text-[10px] text-muted-foreground mt-0.5 italic">
										"{step.comment}"
									</p>
								)}
							</div>

							{/* Status badge */}
							<Badge variant="outline" className={cn("text-[9px] shrink-0", cfg.color)}>
								{cfg.label}
							</Badge>
						</div>
					);
				})}
			</div>

			{/* Actions — seulement si c'est mon tour */}
			{isMyTurn && status === "pending" && (
				<div className="pt-2 border-t border-primary/10 space-y-2">
					{showCommentInput && (
						<div className="flex items-center gap-2">
							<Input
								value={approveComment}
								onChange={(e) => setApproveComment(e.target.value)}
								placeholder="Commentaire (optionnel)"
								className="h-8 text-xs"
							/>
						</div>
					)}
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							onClick={handleApprove}
							disabled={isApproving || isRejecting}
							className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
						>
							{isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
							Approuver
						</Button>
						<Button
							size="sm"
							variant="destructive"
							onClick={() => setRejectOpen(true)}
							disabled={isApproving || isRejecting}
							className="gap-1.5"
						>
							<X className="h-3.5 w-3.5" />
							Rejeter
						</Button>
						{!showCommentInput && (
							<Button
								size="sm"
								variant="ghost"
								onClick={() => setShowCommentInput(true)}
								className="gap-1.5 text-muted-foreground"
							>
								<MessageSquare className="h-3.5 w-3.5" />
								Commentaire
							</Button>
						)}
					</div>
				</div>
			)}

			{/* Reject dialog */}
			<Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<X className="h-5 w-5 text-destructive" />
							Rejeter la correspondance
						</DialogTitle>
						<DialogDescription>
							La correspondance sera retournée au créateur pour modification.
						</DialogDescription>
					</DialogHeader>
					<div className="py-2">
						<Input
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							placeholder="Motif du rejet (obligatoire)"
							className="h-9"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
							Annuler
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={handleReject}
							disabled={isRejecting || !rejectReason.trim()}
						>
							{isRejecting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
							Confirmer le rejet
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
