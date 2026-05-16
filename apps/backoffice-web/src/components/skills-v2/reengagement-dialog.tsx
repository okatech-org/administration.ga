"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
 * Confirme l'envoi d'une relance (email + notif in-app) à un utilisateur
 * dont les compétences IA-suggérées ne sont pas encore validées.
 *
 * Utilisé depuis :
 *   - le banner gap du catalog (bouton "Relancer ces utilisateurs")
 *   - les lignes expanded du catalog (bouton "Relancer")
 *   - éventuellement les cartes profil de la tab Recherche.
 *
 * Côté backend : action `sendReengagement` (cf. adminSkillsActions.ts).
 */
export function ReengagementDialog({
	open,
	onOpenChange,
	profileId,
	target,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	profileId: Id<"profiles">;
	/** Étiquette descriptive de la cible (nom du profil, ou "X profils pour Y") */
	target: string;
}) {
	const sendReengagement = useAction(api.functions.adminSkillsActions.sendReengagement);
	const [message, setMessage] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async () => {
		setSubmitting(true);
		try {
			await sendReengagement({
				profileId,
				customMessage: message.trim() || undefined,
			});
			toast.success("Relance envoyée", {
				description: "L'utilisateur va recevoir un email + une notification in-app.",
			});
			setMessage("");
			onOpenChange(false);
		} catch (err) {
			toast.error("Échec de l'envoi", {
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
					<AlertDialogTitle>Relancer l'utilisateur</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							<p style={{ marginBottom: 8 }}>
								Cible : <strong>{target}</strong>
							</p>
							<p style={{ fontSize: 13 }}>
								Un email + une notification in-app vont être envoyés pour inviter
								l'utilisateur à valider ses compétences suggérées par l'IA.
								Tu peux ajouter un message personnalisé qui sera inclus dans
								l'email (facultatif).
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div style={{ padding: "8px 4px 4px" }}>
					<Textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="Message personnalisé (optionnel)…"
						rows={4}
						disabled={submitting}
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
					<AlertDialogAction onClick={onSubmit} disabled={submitting}>
						{submitting ? "Envoi…" : "Envoyer la relance"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
