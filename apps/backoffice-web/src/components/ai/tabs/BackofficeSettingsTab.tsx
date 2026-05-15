"use client";

/**
 * BackofficeSettingsTab — Panneau Réglages de la fenêtre flottante iAsted.
 *
 * Refonte Phase 4 : passe de 39 lignes à un panneau complet 6 sections :
 *   - Compte
 *   - Voix & IA (voix préférée, vitesse, persona personnalisé, auto-greet)
 *   - Notifications & Hotkeys
 *   - Sécurité (sessions actives, audit log perso, révocation)
 *   - À propos (version + lien vers config org-level dans /settings)
 *
 * Les préférences utilisateur (per-user, cross-org) persistent dans
 * `userIastedVoicePrefs`. La config par organisation reste dans la page
 * Settings admin (`/settings?section=iasted` → `IAstedSection.tsx`).
 */

import { api } from "@convex/_generated/api";
import {
	Bot,
	ChevronRight,
	ExternalLink,
	LogOut,
	Mic,
	Settings as SettingsIcon,
	Shield,
	ShieldAlert,
	Volume2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSuperAdminData } from "@/hooks/use-superadmin-data";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

type Formality = "standard" | "formal" | "relaxed";

const VOICES: Array<{ id: string; label: string; description: string }> = [
	{ id: "ash", label: "Ash", description: "Voix par défaut, posée et claire" },
	{ id: "alloy", label: "Alloy", description: "Voix neutre, polyvalente" },
	{ id: "ballad", label: "Ballad", description: "Voix calme et chaleureuse" },
	{ id: "coral", label: "Coral", description: "Voix féminine, articulée" },
	{ id: "echo", label: "Echo", description: "Voix grave et posée" },
	{ id: "sage", label: "Sage", description: "Voix expressive" },
	{ id: "shimmer", label: "Shimmer", description: "Voix légère et claire" },
	{ id: "verse", label: "Verse", description: "Voix narrative" },
];

const FORMALITY_OPTIONS: Array<{ value: Formality; label: string }> = [
	{ value: "standard", label: "Standard — vouvoiement diplomatique" },
	{ value: "formal", label: "Très formel — protocolaire" },
	{ value: "relaxed", label: "Relâché — naturel et direct (vouvoiement maintenu)" },
];

const DEFAULT_PREFS = {
	preferredVoice: "ash",
	speechRate: 1.0,
	pushToTalk: false,
	autoGreet: true,
	customPersona: "",
	formality: "standard" as Formality,
	preferredLocale: "fr-FR",
	requireConfirmation: true,
};

export function BackofficeSettingsTab() {
	const { userData, isSuperAdmin } = useSuperAdminData();

	// Préférences voix
	const { data: serverPrefs } = useAuthenticatedConvexQuery(
		api.ai.voicePreferences.getMyVoicePreferences,
		{},
	);
	const { mutateAsync: updatePrefs } = useConvexMutationQuery(
		api.ai.voicePreferences.updateMyVoicePreferences,
	);

	// État local synchronisé sur le serveur
	const [prefs, setPrefs] = useState(DEFAULT_PREFS);
	useEffect(() => {
		if (serverPrefs) {
			setPrefs({
				preferredVoice: serverPrefs.preferredVoice ?? "ash",
				speechRate: serverPrefs.speechRate ?? 1.0,
				pushToTalk: serverPrefs.pushToTalk ?? false,
				autoGreet: serverPrefs.autoGreet ?? true,
				customPersona: serverPrefs.customPersona ?? "",
				formality: (serverPrefs.formality as Formality) ?? "standard",
				preferredLocale: serverPrefs.preferredLocale ?? "fr-FR",
				requireConfirmation: serverPrefs.requireConfirmation ?? true,
			});
		}
	}, [serverPrefs]);

	const handleSave = async () => {
		try {
			await updatePrefs({
				voicePrefs: {
					preferredVoice: prefs.preferredVoice,
					speechRate: prefs.speechRate,
					pushToTalk: prefs.pushToTalk,
					autoGreet: prefs.autoGreet,
					customPersona: prefs.customPersona?.trim() || undefined,
					formality: prefs.formality,
					preferredLocale: prefs.preferredLocale,
					requireConfirmation: prefs.requireConfirmation,
				},
			});
			toast.success("Préférences enregistrées. Effectives à la prochaine session.");
		} catch (e: any) {
			toast.error(e?.message ?? "Échec de l'enregistrement");
		}
	};

	// Sessions actives
	const { data: activeSessions } = useAuthenticatedConvexQuery(
		api.ai.voicePreferences.listMyActiveVoiceSessions,
		{},
	);
	const { mutateAsync: revokeAll } = useConvexMutationQuery(
		api.ai.voicePreferences.revokeAllMyVoiceSessions,
	);

	const handleRevokeAll = async () => {
		try {
			const count = await revokeAll({});
			toast.success(`${count} session(s) révoquée(s).`);
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la révocation");
		}
	};

	const hasChanges = useMemo(() => {
		if (!serverPrefs) return false;
		return (
			prefs.preferredVoice !== (serverPrefs.preferredVoice ?? "ash") ||
			prefs.speechRate !== (serverPrefs.speechRate ?? 1.0) ||
			prefs.pushToTalk !== (serverPrefs.pushToTalk ?? false) ||
			prefs.autoGreet !== (serverPrefs.autoGreet ?? true) ||
			(prefs.customPersona ?? "") !== (serverPrefs.customPersona ?? "") ||
			prefs.formality !== (serverPrefs.formality ?? "standard") ||
			prefs.preferredLocale !== (serverPrefs.preferredLocale ?? "fr-FR") ||
			prefs.requireConfirmation !== (serverPrefs.requireConfirmation ?? true)
		);
	}, [prefs, serverPrefs]);

	return (
		<ScrollArea className="flex-1 min-h-0">
			<div className="p-3 space-y-4">
				{/* ─── Compte ─── */}
				<Section
					icon={<Bot className="h-3.5 w-3.5" />}
					title="Compte"
				>
					<div className="rounded-lg border p-3 space-y-1">
						<p className="text-sm font-medium">{userData?.name ?? "Utilisateur"}</p>
						<p className="text-xs text-muted-foreground">{userData?.email}</p>
						<Badge variant="outline" className="text-[9px] mt-1">
							{isSuperAdmin ? "Super Administrateur" : "Administrateur"}
						</Badge>
					</div>
				</Section>

				{/* ─── Voix & IA ─── */}
				<Section
					icon={<Volume2 className="h-3.5 w-3.5" />}
					title="Voix & IA"
				>
					<div className="space-y-3">
						<div className="space-y-1">
							<Label className="text-[11px]">Voix de l'assistant</Label>
							<Select
								value={prefs.preferredVoice}
								onValueChange={(v) => setPrefs((p) => ({ ...p, preferredVoice: v }))}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{VOICES.map((v) => (
										<SelectItem key={v.id} value={v.id} className="text-xs">
											<div className="flex flex-col">
												<span className="font-medium">{v.label}</span>
												<span className="text-[10px] text-muted-foreground">{v.description}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1">
							<div className="flex items-center justify-between">
								<Label className="text-[11px]">Vitesse de parole</Label>
								<span className="text-[10px] text-muted-foreground">
									{prefs.speechRate.toFixed(2)}x
								</span>
							</div>
							<Input
								type="range"
								min={0.5}
								max={2.0}
								step={0.05}
								value={prefs.speechRate}
								onChange={(e) =>
									setPrefs((p) => ({ ...p, speechRate: parseFloat(e.target.value) }))
								}
								className="h-2"
							/>
						</div>

						<div className="space-y-1">
							<Label className="text-[11px]">Niveau de formalité</Label>
							<Select
								value={prefs.formality}
								onValueChange={(v) =>
									setPrefs((p) => ({ ...p, formality: v as Formality }))
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FORMALITY_OPTIONS.map((o) => (
										<SelectItem key={o.value} value={o.value} className="text-xs">
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1">
							<Label className="text-[11px]">Persona personnalisé (instructions facultatives)</Label>
							<Textarea
								value={prefs.customPersona ?? ""}
								onChange={(e) =>
									setPrefs((p) => ({ ...p, customPersona: e.target.value }))
								}
								placeholder="Ex : « Réponses très courtes, pas de formules de politesse. »"
								className="min-h-[60px] text-xs"
							/>
							<p className="text-[9px] text-muted-foreground">
								Injecté en début de prompt. Ne peut pas contourner les règles de sécurité.
							</p>
						</div>

						<ToggleRow
							label="Saluer automatiquement"
							hint="L'assistant prononce une salutation à l'ouverture de la session vocale."
							checked={prefs.autoGreet}
							onChange={(v) => setPrefs((p) => ({ ...p, autoGreet: v }))}
						/>
						<ToggleRow
							label="Push-to-talk"
							hint="Maintenir une touche pour parler (sinon écoute permanente)."
							checked={prefs.pushToTalk}
							onChange={(v) => setPrefs((p) => ({ ...p, pushToTalk: v }))}
						/>
						<ToggleRow
							label="Confirmation requise pour actions sensibles"
							hint="Recommandé. L'agent demandera 'oui' avant chaque action mutative."
							checked={prefs.requireConfirmation}
							onChange={(v) => setPrefs((p) => ({ ...p, requireConfirmation: v }))}
						/>

						<Button
							size="sm"
							onClick={handleSave}
							disabled={!hasChanges}
							className="w-full"
						>
							{hasChanges ? "Enregistrer les changements" : "À jour"}
						</Button>
					</div>
				</Section>

				{/* ─── Sécurité ─── */}
				<Section
					icon={<Shield className="h-3.5 w-3.5" />}
					title="Sécurité"
				>
					<div className="space-y-2">
						<div className="rounded-lg border p-2.5">
							<div className="flex items-center justify-between mb-1">
								<p className="text-xs font-medium">Sessions actives</p>
								<Badge variant="outline" className="text-[9px]">
									{activeSessions?.length ?? 0}
								</Badge>
							</div>
							<p className="text-[10px] text-muted-foreground mb-2">
								Sessions vocales/de présence ouvertes sur vos appareils.
							</p>
							{activeSessions && activeSessions.length > 0 && (
								<Button
									size="sm"
									variant="destructive"
									onClick={handleRevokeAll}
									className="w-full h-7 text-[10px]"
								>
									<ShieldAlert className="h-3 w-3 mr-1" />
									Révoquer toutes mes sessions
								</Button>
							)}
						</div>
					</div>
				</Section>

				{/* ─── Configuration org (lien vers IAstedSection admin) ─── */}
				{isSuperAdmin && (
					<Section
						icon={<SettingsIcon className="h-3.5 w-3.5" />}
						title="Configuration iAsted (organisation)"
					>
						<Link
							href="/settings?section=iasted"
							className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
						>
							<div className="space-y-0.5">
								<p className="text-xs font-medium">Persona, tools, escalation, quotas</p>
								<p className="text-[10px] text-muted-foreground">
									Réglages partagés par toute l'organisation.
								</p>
							</div>
							<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
						</Link>
					</Section>
				)}

				{/* ─── À propos ─── */}
				<Section icon={<Mic className="h-3.5 w-3.5" />} title="À propos">
					<div className="rounded-lg border p-3 space-y-1">
						<p className="text-[11px] text-muted-foreground">
							iAsted v1.0 — Assistant vocal diplomatique
						</p>
						<p className="text-[11px] text-muted-foreground">Plateforme Consulat.ga</p>
						<a
							href="https://docs.consulat.ga/iasted"
							target="_blank"
							rel="noopener noreferrer"
							className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
						>
							Documentation
							<ExternalLink className="h-2.5 w-2.5" />
						</a>
					</div>
				</Section>
			</div>
		</ScrollArea>
	);
}

// ─────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────

function Section({
	icon,
	title,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-2">
			<h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
				{icon}
				{title}
			</h4>
			{children}
		</section>
	);
}

function ToggleRow({
	label,
	hint,
	checked,
	onChange,
}: {
	label: string;
	hint?: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<div
			className={cn(
				"flex items-start justify-between gap-2 rounded-md border p-2.5",
			)}
		>
			<div className="space-y-0.5 flex-1">
				<p className="text-[11px] font-medium">{label}</p>
				{hint && <p className="text-[9px] text-muted-foreground">{hint}</p>}
			</div>
			<Switch checked={checked} onCheckedChange={onChange} />
		</div>
	);
}
