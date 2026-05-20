"use client";

/**
 * VoicePrintEnrollmentPanel — Wizard d'enrollment de l'empreinte vocale
 * iAsted (Sprint 5.5 — G2 wiring, Ronde 3).
 *
 * Workflow simple :
 *   1. État initial : liste des voiceprints enrollés (ou texte « Aucune empreinte »).
 *   2. Clic « Activer la vérification vocale » → wizard 3 s :
 *      a. Demande permission micro + countdown 3 s.
 *      b. Pendant 3 s, extraction du voiceprint via `extractVoicePrint`.
 *      c. Upload via `enrollMyVoicePrint`.
 *   3. Liste mise à jour automatiquement.
 *
 * Utilisable dans n'importe quelle page Réglages des 3 surfaces.
 * Privacy : aucun audio uploadé, juste le vecteur de features (~32 floats).
 */

import { api } from "@convex/_generated/api";
import {
	useMutation as useConvexMutation,
	useQuery as useConvexQuery,
} from "convex/react";
import { extractVoicePrint } from "@workspace/iasted";
import { Mic, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

interface VoicePrint {
	_id: string;
	algorithm: string;
	createdAt: number;
	lastMatchedAt?: number;
	matchCount: number;
	revoked: boolean;
	expiresAt: number;
}

interface VoicePrintEnrollmentPanelProps {
	className?: string;
}

export function VoicePrintEnrollmentPanel({
	className,
}: VoicePrintEnrollmentPanelProps) {
	const prints = useConvexQuery(
		(api as any).ai.voicePrints.listMyVoicePrints,
		{},
	) as VoicePrint[] | undefined;
	const enroll = useConvexMutation(
		(api as any).ai.voicePrints.enrollMyVoicePrint,
	);
	const revoke = useConvexMutation(
		(api as any).ai.voicePrints.revokeMyVoicePrint,
	);

	const [enrolling, setEnrolling] = useState(false);
	const [countdown, setCountdown] = useState<number | null>(null);

	const handleEnroll = async () => {
		if (enrolling) return;
		setEnrolling(true);
		setCountdown(3);
		// Countdown visuel.
		for (let i = 3; i > 0; i--) {
			setCountdown(i);
			await new Promise<void>((r) => setTimeout(r, 1000));
		}
		setCountdown(null);
		toast.info("Parlez maintenant pendant 3 secondes…", { duration: 3500 });
		try {
			const embeddingB64 = await extractVoicePrint();
			if (!embeddingB64) {
				toast.error(
					"Échec de capture (permission micro refusée ou navigateur non supporté).",
				);
				return;
			}
			await enroll({ embeddingB64 });
			toast.success("Empreinte vocale enregistrée.");
		} catch (e: any) {
			toast.error(
				typeof e?.data === "string"
					? e.data
					: e?.message ?? "Échec de l'enregistrement",
			);
		} finally {
			setEnrolling(false);
		}
	};

	const handleRevoke = async (id: string) => {
		try {
			await revoke({ id: id as never });
			toast.success("Empreinte révoquée.");
		} catch (e: any) {
			toast.error(e?.message ?? "Échec de la révocation");
		}
	};

	const active = (prints ?? []).filter((p) => !p.revoked);

	return (
		<div className={className ?? "space-y-4"}>
			<div className="rounded-lg border p-3 space-y-3">
				<div className="flex items-center gap-2">
					<ShieldCheck className="h-4 w-4 text-muted-foreground" />
					<h4 className="text-sm font-medium">
						Vérification vocale pour actions sensibles
					</h4>
				</div>
				<p className="text-xs text-muted-foreground">
					Enregistre votre empreinte vocale pour ajouter un facteur de
					sécurité aux actions destructives (suspendre un utilisateur,
					modifier un rôle, etc.). Aucun audio n'est uploadé — seul un
					vecteur mathématique de ~32 valeurs est stocké. Révocable à tout
					moment. Renouvellement requis tous les 6 mois.
				</p>
				<Button
					type="button"
					size="sm"
					onClick={handleEnroll}
					disabled={enrolling || active.length >= 3}
					className="w-full"
				>
					<Mic className="h-3.5 w-3.5 mr-1" />
					{countdown !== null
						? `Préparez-vous… ${countdown}`
						: enrolling
							? "Enregistrement en cours…"
							: active.length >= 3
								? "Limite atteinte (3 max — révoquez d'abord)"
								: "Activer la vérification vocale (3 s)"}
				</Button>
			</div>

			{active.length > 0 && (
				<div className="rounded-lg border p-3 space-y-2">
					<h4 className="text-sm font-medium">
						Empreintes actives ({active.length}/3)
					</h4>
					<ul className="space-y-1.5">
						{active.map((p) => {
							const isExpiringSoon =
								p.expiresAt - Date.now() < 30 * 24 * 60 * 60 * 1000;
							const created = new Date(p.createdAt).toLocaleDateString(
								"fr-FR",
								{ dateStyle: "short" },
							);
							const lastMatch = p.lastMatchedAt
								? new Date(p.lastMatchedAt).toLocaleDateString("fr-FR", {
										dateStyle: "short",
									})
								: "jamais utilisée";
							return (
								<li
									key={p._id}
									className="flex items-start justify-between gap-2 text-xs"
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-baseline gap-2 flex-wrap">
											<span className="font-medium">
												Empreinte du {created}
											</span>
											<Badge variant="outline" className="text-[9px]">
												{p.algorithm}
											</Badge>
											{isExpiringSoon && (
												<Badge
													variant="outline"
													className="text-[9px] text-amber-700"
												>
													Bientôt expirée
												</Badge>
											)}
										</div>
										<p className="text-[10px] text-muted-foreground mt-0.5">
											{p.matchCount} match{p.matchCount > 1 ? "s" : ""} —
											dernière utilisation : {lastMatch}
										</p>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-6 w-6 p-0 shrink-0"
										onClick={() => handleRevoke(p._id)}
										aria-label="Révoquer cette empreinte"
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</div>
	);
}
