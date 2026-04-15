/**
 * CitizenProfileDrawer — fiche citoyen 360° en drawer latéral (Sheet).
 *
 * Sections :
 * 1. Identité (nom, matricule, contact)
 * 2. Documents liés (via slot `documentsSlot`)
 * 3. Historique conversations / appels (via slots `chatHistorySlot`, `callHistorySlot`)
 * 4. Consent RGPD enregistrement (Sprint 6, lecture de `meetings.citizenConsent`)
 * 5. Actions rapides (via `actions` prop)
 *
 * Design agnostique côté data : les sections secondaires sont des slots,
 * le consumer (agent-web) injecte les composants Convex qu'il souhaite.
 *
 * DS v3 :
 * - Surface : bg-card (S1)
 * - Sections séparées par `border-foreground/5`
 * - Icônes boîte `rounded-xl bg-foreground/8`
 * - Badges RGPD : `bg-emerald-500/15` (accepté) / `bg-rose-500/10` (décliné) / `bg-muted` (en attente)
 */

"use client";

import { type ReactNode } from "react";
import { FileText, Phone, Shield, ShieldAlert, ShieldCheck, User, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@workspace/ui/components/sheet";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import type { CitizenRecordingConsent } from "../../types/agent-presence";

export interface CitizenProfileDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Identifiant Convex du citoyen (pour debug/logs). */
	citizenId?: string;
	/** Nom affiché (ex : "PELLEN-LAKOUMBA Gueylord"). */
	name: string;
	/** Matricule officiel (ex : "GAB-FR-2026-00297"). */
	matricule?: string;
	/** Avatar URL. */
	avatarUrl?: string | null;
	/** Téléphone principal. */
	phone?: string;
	/** Email. */
	email?: string;
	/** Badge de statut global (ex : "Actif", "Dossier incomplet"). */
	statusBadge?: ReactNode;

	// ── Slots data-source-agnostic ────────────────────────
	/** Section Documents (liens iDocument, listes scrollables, etc.). */
	documentsSlot?: ReactNode;
	/** Historique chats (dernières conversations citoyen ↔ agents). */
	chatHistorySlot?: ReactNode;
	/** Historique appels. */
	callHistorySlot?: ReactNode;
	/** Consent RGPD le plus récent (optionnel). */
	recordingConsent?: CitizenRecordingConsent;

	// ── Actions rapides ───────────────────────────────────
	/** Boutons/actions rapides placés en bas du drawer. */
	actions?: ReactNode;

	className?: string;
}

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
	return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function ConsentBadge({ consent }: { consent?: CitizenRecordingConsent }) {
	if (!consent) {
		return (
			<div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-2">
				<Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				<div className="min-w-0 flex-1">
					<p className="text-xs font-bold text-foreground">Aucune demande</p>
					<p className="text-[10px] font-medium text-muted-foreground">
						Le citoyen n'a pas encore été sollicité pour un consentement.
					</p>
				</div>
			</div>
		);
	}

	const { recordingAccepted, recordingAcceptedAt, recordingDeclinedAt } = consent;

	if (recordingAccepted === true) {
		return (
			<div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 px-2.5 py-2">
				<ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
				<div className="min-w-0 flex-1">
					<p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
						Enregistrement accepté
					</p>
					{recordingAcceptedAt && (
						<p className="text-[10px] font-medium text-muted-foreground">
							{new Date(recordingAcceptedAt).toLocaleString("fr-FR")}
						</p>
					)}
				</div>
			</div>
		);
	}

	if (recordingAccepted === false || recordingDeclinedAt) {
		return (
			<div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-2.5 py-2">
				<ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
				<div className="min-w-0 flex-1">
					<p className="text-xs font-bold text-rose-600 dark:text-rose-400">
						Enregistrement refusé
					</p>
					{recordingDeclinedAt && (
						<p className="text-[10px] font-medium text-muted-foreground">
							{new Date(recordingDeclinedAt).toLocaleString("fr-FR")}
						</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2 rounded-lg bg-amber-500/15 dark:bg-amber-500/10 px-2.5 py-2">
			<Shield className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
			<div className="min-w-0 flex-1">
				<p className="text-xs font-bold text-amber-700 dark:text-amber-400">En attente</p>
				<p className="text-[10px] font-medium text-muted-foreground">
					Consentement demandé, pas encore validé.
				</p>
			</div>
		</div>
	);
}

export function CitizenProfileDrawer({
	open,
	onOpenChange,
	name,
	matricule,
	avatarUrl,
	phone,
	email,
	statusBadge,
	documentsSlot,
	chatHistorySlot,
	callHistorySlot,
	recordingConsent,
	actions,
	className,
}: CitizenProfileDrawerProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className={cn(
					"flex w-full flex-col gap-0 bg-card p-0 sm:max-w-[420px]",
					className,
				)}
			>
				<SheetHeader className="shrink-0 border-b border-foreground/5 bg-card px-4 py-3">
					<div className="flex items-start gap-3">
						<Avatar className="h-12 w-12 shrink-0">
							{avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
							<AvatarFallback className="bg-primary text-sm font-bold text-white">
								{getInitials(name)}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<SheetTitle className="truncate text-base leading-tight font-black uppercase text-foreground">
								{name}
							</SheetTitle>
							{matricule && (
								<p className="truncate font-mono text-xs font-bold tracking-wide text-muted-foreground">
									{matricule}
								</p>
							)}
							{statusBadge && <div className="mt-1">{statusBadge}</div>}
						</div>
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 active:scale-[0.97]"
							aria-label="Fermer"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					</div>
					<SheetDescription className="sr-only">
						Fiche citoyen 360° avec identité, documents, historique et consentement RGPD.
					</SheetDescription>
				</SheetHeader>

				<ScrollArea className="flex-1 px-4 py-3">
					<div className="space-y-4">
						{/* Contact */}
						{(phone || email) && (
							<section>
								<h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
									Contact
								</h3>
								<div className="space-y-2">
									{phone && (
										<div className="flex items-center gap-2.5 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5">
											<Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
											<span className="flex-1 truncate text-xs font-bold">{phone}</span>
										</div>
									)}
									{email && (
										<div className="flex items-center gap-2.5 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5">
											<User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
											<span className="flex-1 truncate text-xs font-bold">{email}</span>
										</div>
									)}
								</div>
							</section>
						)}

						{/* Documents */}
						{documentsSlot && (
							<section>
								<h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
									<FileText className="h-3 w-3" />
									Documents
								</h3>
								{documentsSlot}
							</section>
						)}

						{/* Historique chats */}
						{chatHistorySlot && (
							<section>
								<h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
									Dernières conversations
								</h3>
								{chatHistorySlot}
							</section>
						)}

						{/* Historique appels */}
						{callHistorySlot && (
							<section>
								<h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
									Derniers appels
								</h3>
								{callHistorySlot}
							</section>
						)}

						{/* Consent RGPD */}
						<section>
							<h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
								<Shield className="h-3 w-3" />
								Consentement d'enregistrement (RGPD)
							</h3>
							<ConsentBadge consent={recordingConsent} />
						</section>
					</div>
				</ScrollArea>

				{actions && (
					<div className="shrink-0 border-t border-foreground/5 bg-card p-3">
						{actions}
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
