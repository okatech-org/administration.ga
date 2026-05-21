"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@workspace/ui/components/textarea";

/**
 * Confirme une relance en LOT par nom de compétence — tous les profils
 * dont l'IA a suggéré cette compétence sans qu'ils l'aient déclarée
 * dans leur CV reçoivent un email + une notification.
 *
 * Limite : 200 destinataires max (hard-cap côté backend).
 */
export function ReengagementBatchDialog({
	open,
	onOpenChange,
	skillName,
	estimatedCount,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	skillName: string;
	estimatedCount: number;
}) {
	const sendBatch = useAction(
		api.functions.adminSkillsActions.sendReengagementBatchBySkill,
	);
	const [message, setMessage] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async () => {
		setSubmitting(true);
		try {
			const r = await sendBatch({
				skillName,
				customMessage: message.trim() || undefined,
			});
			toast.success(
				`Relances envoyées : ${r.sent} succès, ${r.failed} échecs sur ${r.targeted} ciblés`,
			);
			setMessage("");
			onOpenChange(false);
		} catch (err) {
			toast.error("Échec du lot", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Relancer en lot</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p style={{ marginBottom: 8 }}>
								Compétence : <strong>« {skillName} »</strong>
							</p>
							<p style={{ fontSize: 13, marginBottom: 6 }}>
								Environ <strong>{estimatedCount}</strong> profils sont concernés
								(suggestion IA non encore validée dans leur CV). Chaque destinataire
								recevra un email + une notification in-app.
							</p>
							<p style={{ fontSize: 12, color: "var(--text-muted)" }}>
								Limite : 200 destinataires max par envoi.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div style={{ padding: "8px 4px 4px" }}>
					<Textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="Message personnalisé (optionnel, ajouté à l'email)…"
						rows={4}
						disabled={submitting}
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
					<AlertDialogAction onClick={onSubmit} disabled={submitting}>
						{submitting ? "Envoi en cours…" : "Envoyer les relances"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
