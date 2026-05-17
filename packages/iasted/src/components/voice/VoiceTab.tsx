/**
 * VoiceTab — Onglet « iVocal » de la fenêtre iAsted.
 *
 * Composant 100% agnostique du provider : ne dépend que du contrat
 * canonique `IAstedVoiceController` publié via `IAstedVoiceContext`.
 *
 * Trois états :
 *  - Provider indisponible : message d'erreur explicite (`unavailableReason`)
 *  - Session inactive : auto-démarre la session puis affiche la transcription
 *    (legacy CTA conservé en fallback si l'auto-start échoue).
 *  - Session active : indicateur d'état + transcription (si capability) +
 *    carte de confirmation (si `pendingConfirmation`) + bouton Raccrocher
 *
 * Auto-start : à l'ouverture du tab, si le provider est disponible mais la
 * session n'est pas connectée (et pas en cours de connexion), `activateVoice`
 * est appelé automatiquement pour entamer immédiatement la transcription.
 * C'est le comportement attendu quand l'utilisateur ouvre iVocal — soit en
 * cliquant l'item de l'éventail, soit par commande vocale (dans ce cas la
 * session est déjà active et l'auto-start est un no-op).
 *
 * À monter comme `tabContent.ivoice` dans `IAstedWindow` / `CitizenIAstedWindow`.
 */

"use client";

import { useEffect, useRef } from "react";
import { Mic, PhoneOff, AlertTriangle, Check, X, Loader2 } from "lucide-react";
import { useIAstedVoiceController } from "../../hooks/use-iasted-voice-context";
import { IAstedDocumentCard } from "./IAstedDocumentCard";

export function VoiceTab() {
	const controller = useIAstedVoiceController();
	const autoStartedRef = useRef(false);

	// Auto-démarrage de la session vocale à l'ouverture du tab iVocal.
	// Garde-fous :
	//  - `controller.available` (provider configuré et autorisé)
	//  - `voiceState === "idle"` (pas en cours de connexion ou déjà connecté)
	//  - `autoStartedRef` (une seule tentative par cycle de montage du tab)
	useEffect(() => {
		if (!controller) return;
		if (autoStartedRef.current) return;
		if (!controller.available) return;
		if (controller.voiceState !== "idle") return;
		autoStartedRef.current = true;
		void controller.activateVoice();
	}, [controller]);

	if (!controller) {
		return (
			<EmptyState
				icon={<AlertTriangle className="h-8 w-8 text-amber-500" />}
				title="iVocal non disponible"
				message="Aucun provider vocal n'est configuré dans cette application."
			/>
		);
	}

	if (!controller.available) {
		return (
			<EmptyState
				icon={<AlertTriangle className="h-8 w-8 text-amber-500" />}
				title="Mode vocal indisponible"
				message={
					controller.unavailableReason
						? `Raison : ${controller.unavailableReason}.`
						: "Le mode vocal n'est pas activé sur cette installation."
				}
				footer={
					<span className="text-[10px] text-muted-foreground/70">
						Provider : {controller.providerLabel}
					</span>
				}
			/>
		);
	}

	if (!controller.isConnected) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
				<div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
					<Mic className="h-7 w-7 text-violet-600 dark:text-violet-400" />
				</div>
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">iVocal — iAsted</h3>
					<p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
						Discutez à voix haute avec iAsted. Naviguez, posez des
						questions, déclenchez des actions — comme un appel à un
						collègue.
					</p>
				</div>
				<button
					type="button"
					onClick={() => void controller.activateVoice()}
					disabled={controller.voiceState === "connecting"}
					className="inline-flex items-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-4 py-2 text-sm font-semibold transition-colors"
				>
					{controller.voiceState === "connecting" ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							Connexion…
						</>
					) : (
						<>
							<Mic className="h-4 w-4" />
							Démarrer la conversation
						</>
					)}
				</button>
				<p className="text-[10px] text-muted-foreground/70">
					Raccourci : <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Cmd+Shift+V</kbd>{" "}
					depuis n'importe où
				</p>
			</div>
		);
	}

	// ── Session active ──────────────────────────────────────────────
	const stateLabel = (() => {
		switch (controller.voiceState) {
			case "connecting":
				return "Connexion…";
			case "listening":
				return "iAsted vous écoute";
			case "thinking":
			case "processing":
				return "iAsted réfléchit…";
			case "speaking":
				return "iAsted parle";
			case "error":
				return "Erreur";
			default:
				return "Conversation active";
		}
	})();

	const stateColorClass =
		controller.voiceState === "speaking"
			? "bg-emerald-500"
			: controller.voiceState === "listening"
				? "bg-amber-500"
				: controller.voiceState === "error"
					? "bg-rose-500"
					: "bg-muted-foreground/50";

	const isAnimated =
		controller.voiceState === "speaking" || controller.voiceState === "listening";

	return (
		<div className="flex h-full flex-col">
			{/* Header : état + niveau audio */}
			<div className="px-4 py-3 border-b border-border/40">
				<div className="flex items-center gap-2.5">
					<span
						className={`relative inline-flex h-2.5 w-2.5 rounded-full ${stateColorClass}`}
					>
						{isAnimated && (
							<span
								className={`absolute inset-0 rounded-full ${stateColorClass} animate-ping opacity-75`}
								aria-hidden
							/>
						)}
					</span>
					<span className="text-sm font-semibold">{stateLabel}</span>
					<span className="ml-auto text-[10px] text-muted-foreground">
						{controller.providerLabel}
					</span>
				</div>
				{/* Bar audio (visible quand listening/speaking) */}
				{isAnimated && controller.audioLevel > 0 && (
					<div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
						<div
							className={`h-full ${stateColorClass} transition-[width] duration-100`}
							style={{
								width: `${Math.min(100, Math.max(4, controller.audioLevel * 100))}%`,
							}}
						/>
					</div>
				)}
			</div>

			{/* Transcription */}
			<div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
				{controller.capabilities.realTimeTranscription ? (
					controller.messages.length === 0 ? (
						<p className="text-xs text-muted-foreground/70 text-center py-8">
							La transcription apparaîtra ici au fil de la conversation.
						</p>
					) : (
						<div className="space-y-3">
							{controller.messages.map((m) => (
								<div key={m.id} className="space-y-1">
									<p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
										{m.role === "user" ? "Vous" : "iAsted"}
									</p>
									<p className="text-xs leading-relaxed">{m.content}</p>
								</div>
							))}
						</div>
					)
				) : (
					<div className="flex flex-col items-center justify-center h-full text-center gap-2 py-6">
						<Mic className="h-6 w-6 text-muted-foreground/40" />
						<p className="text-xs text-muted-foreground/70 max-w-[260px]">
							Ce provider ne fournit pas de transcription textuelle.
							Continuez à parler — iAsted vous répondra à voix haute.
						</p>
					</div>
				)}
			</div>

			{/* Cartes des documents générés par iAsted pendant la session.
			    Le composant écoute `iasted:document-created` (window event émis
			    par `useIAstedHost.dispatchUiAction`) et reste muet tant
			    qu'aucun document n'a été produit. */}
			<IAstedDocumentCard />

			{/* Carte de confirmation (Gemini Live uniquement) */}
			{controller.pendingConfirmation && (
				<div className="border-t border-border/40 bg-amber-500/5 px-4 py-3 space-y-2">
					<div className="flex items-start gap-2">
						<AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
						<div className="flex-1 min-w-0 space-y-1">
							<p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-500">
								Confirmation requise
							</p>
							<p className="text-xs leading-snug">
								{controller.pendingConfirmation.description}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => void controller.pendingConfirmation?.confirm()}
							disabled={controller.pendingConfirmation.isConfirming}
							className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-semibold transition-colors"
						>
							{controller.pendingConfirmation.isConfirming ? (
								<Loader2 className="h-3 w-3 animate-spin" />
							) : (
								<Check className="h-3 w-3" />
							)}
							Confirmer
						</button>
						<button
							type="button"
							onClick={() => controller.pendingConfirmation?.reject()}
							disabled={controller.pendingConfirmation.isConfirming}
							className="inline-flex items-center gap-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-60 px-3 py-1.5 text-xs font-medium transition-colors"
						>
							<X className="h-3 w-3" />
							Annuler
						</button>
					</div>
				</div>
			)}

			{/* Footer : bouton Raccrocher */}
			<div className="border-t border-border/40 px-4 py-3">
				<button
					type="button"
					onClick={() => void controller.deactivateVoice()}
					className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
				>
					<PhoneOff className="h-4 w-4" />
					Raccrocher
				</button>
				<p className="mt-2 text-[10px] text-center text-muted-foreground/70">
					Vous pouvez fermer la fenêtre — la conversation continue.
				</p>
			</div>
		</div>
	);
}

function EmptyState({
	icon,
	title,
	message,
	footer,
}: {
	icon: React.ReactNode;
	title: string;
	message: string;
	footer?: React.ReactNode;
}) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
			{icon}
			<div className="space-y-1">
				<h3 className="text-sm font-semibold">{title}</h3>
				<p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
					{message}
				</p>
			</div>
			{footer}
		</div>
	);
}
