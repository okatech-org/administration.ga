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
	IASTED_SUPPORTED_LOCALES,
	type IastedLocale,
	type LocaleCategory,
} from "@workspace/iasted/locales";
import {
	BookOpen,
	Bot,
	ChevronRight,
	ExternalLink,
	Languages,
	LogOut,
	Mic,
	Plus,
	Settings as SettingsIcon,
	Shield,
	ShieldAlert,
	Trash2,
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
	SelectGroup,
	SelectItem,
	SelectLabel,
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

// Regroupement éditorial des 15 langues iAsted pour le Select : ONU →
// Internationales → Africaines. La source de vérité est `IASTED_SUPPORTED_LOCALES`.
const LOCALE_GROUP_LABELS: Record<LocaleCategory, string> = {
	un: "Langues ONU",
	international: "Langues internationales",
	african: "Langues africaines",
};

const LOCALE_GROUPS: Array<{
	category: LocaleCategory;
	label: string;
	items: IastedLocale[];
}> = (["un", "international", "african"] as LocaleCategory[]).map((category) => ({
	category,
	label: LOCALE_GROUP_LABELS[category],
	items: IASTED_SUPPORTED_LOCALES.filter((l) => l.category === category),
}));

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

	// ── Lexique personnel iAsted ──
	// Expressions enseignées par l'utilisateur dans des langues non couvertes
	// par OpenAI (Téké, Fang, Punu, etc.). Injectées dans le system prompt
	// à chaque session.
	const { data: lexicon } = useAuthenticatedConvexQuery(
		(api as any).ai.userLexicon.listMyLexicon,
		{},
	);
	const { mutateAsync: addLexiconPhrase } = useConvexMutationQuery(
		(api as any).ai.userLexicon.addPhrase,
	);
	const { mutateAsync: deleteLexiconPhrase } = useConvexMutationQuery(
		(api as any).ai.userLexicon.deletePhrase,
	);
	const [newLexiconEntry, setNewLexiconEntry] = useState({
		expression: "",
		language: "",
		frenchTranslation: "",
		usage: "",
	});
	const canAddLexicon =
		newLexiconEntry.expression.trim() &&
		newLexiconEntry.language.trim() &&
		newLexiconEntry.frenchTranslation.trim();

	// Convex `ConvexError(msg)` arrive côté client avec le message dans
	// `e.data` ; les autres exceptions atterrissent dans `e.message`.
	const extractConvexErrorMessage = (e: any, fallback: string): string => {
		if (typeof e?.data === "string") return e.data;
		if (typeof e?.message === "string") return e.message;
		return fallback;
	};

	const handleAddLexiconPhrase = async () => {
		if (!canAddLexicon) return;
		try {
			await addLexiconPhrase({
				expression: newLexiconEntry.expression,
				language: newLexiconEntry.language,
				frenchTranslation: newLexiconEntry.frenchTranslation,
				usage: newLexiconEntry.usage.trim() || undefined,
			});
			setNewLexiconEntry({
				expression: "",
				language: "",
				frenchTranslation: "",
				usage: "",
			});
			toast.success("Expression ajoutée au lexique personnel.");
		} catch (e: any) {
			toast.error(extractConvexErrorMessage(e, "Échec de l'ajout"));
		}
	};

	const handleDeleteLexiconPhrase = async (id: string) => {
		try {
			await deleteLexiconPhrase({ id: id as any });
			toast.success("Expression supprimée.");
		} catch (e: any) {
			toast.error(
				extractConvexErrorMessage(e, "Échec de la suppression"),
			);
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
							<Label className="text-[11px] flex items-center gap-1.5">
								<Languages className="h-3 w-3" />
								Langue de l'assistant
							</Label>
							<Select
								value={prefs.preferredLocale}
								onValueChange={(v) =>
									setPrefs((p) => ({ ...p, preferredLocale: v }))
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{LOCALE_GROUPS.map((group) => (
										<SelectGroup key={group.category}>
											<SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
												{group.label}
											</SelectLabel>
											{group.items.map((l) => (
												<SelectItem
													key={l.code}
													value={l.code}
													className="text-xs"
												>
													<span className="inline-flex items-center gap-2">
														<span aria-hidden>{l.flag}</span>
														<span className="font-medium">{l.labelFr}</span>
														<span className="text-[10px] text-muted-foreground">
															{l.labelNative}
														</span>
														{l.tier === "partial" && (
															<Badge
																variant="outline"
																className="ml-1 text-[8px] py-0 px-1"
															>
																qualité variable
															</Badge>
														)}
													</span>
												</SelectItem>
											))}
										</SelectGroup>
									))}
								</SelectContent>
							</Select>
							<p className="text-[9px] text-muted-foreground">
								Pilote la voix, la transcription et les directives système.
								Le changement prend effet à la prochaine session vocale.
							</p>
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

				{/* ─── Lexique personnel ─── */}
				<Section
					icon={<BookOpen className="h-3.5 w-3.5" />}
					title="Lexique personnel"
				>
					<div className="space-y-3">
						<p className="text-[10px] text-muted-foreground leading-relaxed">
							Apprenez à iAsted des expressions dans une langue non supportée
							nativement (Téké, Fang, Punu…). Elles sont injectées dans son
							prompt système à chaque session.
							<br />
							<span className="text-amber-600 dark:text-amber-500">
								⚠ Reconnaissance limitée à l'écrit (iChat) — la transcription
								vocale Whisper ne couvre pas ces langues.
							</span>
						</p>

						{/* Liste des expressions existantes */}
						{lexicon && lexicon.length > 0 && (
							<div className="space-y-1.5">
								{lexicon.map((entry: any) => (
									<div
										key={entry._id}
										className="rounded-lg border p-2 flex items-start gap-2"
									>
										<div className="flex-1 min-w-0 space-y-0.5">
											<div className="flex items-center gap-1.5 flex-wrap">
												<span className="text-xs font-medium">
													{entry.expression}
												</span>
												<Badge variant="outline" className="text-[9px] py-0 px-1.5">
													{entry.language}
												</Badge>
											</div>
											<p className="text-[10px] text-muted-foreground">
												→ {entry.frenchTranslation}
												{entry.usage && (
													<span className="text-muted-foreground/70">
														{" "}
														· {entry.usage}
													</span>
												)}
											</p>
										</div>
										<Button
											size="icon"
											variant="ghost"
											className="h-6 w-6 shrink-0"
											onClick={() => handleDeleteLexiconPhrase(entry._id)}
											aria-label="Supprimer cette expression"
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								))}
							</div>
						)}

						{/* Formulaire d'ajout */}
						<div className="rounded-lg border border-dashed p-2.5 space-y-2">
							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1">
									<Label className="text-[10px]">Expression</Label>
									<Input
										value={newLexiconEntry.expression}
										onChange={(e) =>
											setNewLexiconEntry((p) => ({
												...p,
												expression: e.target.value,
											}))
										}
										placeholder="Ex : Mbote"
										className="h-7 text-xs"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-[10px]">Langue</Label>
									<Input
										value={newLexiconEntry.language}
										onChange={(e) =>
											setNewLexiconEntry((p) => ({
												...p,
												language: e.target.value,
											}))
										}
										placeholder="Ex : Téké"
										className="h-7 text-xs"
									/>
								</div>
							</div>
							<div className="space-y-1">
								<Label className="text-[10px]">Traduction française</Label>
								<Input
									value={newLexiconEntry.frenchTranslation}
									onChange={(e) =>
										setNewLexiconEntry((p) => ({
											...p,
											frenchTranslation: e.target.value,
										}))
									}
									placeholder="Ex : Bonjour"
									className="h-7 text-xs"
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-[10px]">
									Contexte d'usage{" "}
									<span className="text-muted-foreground/60">(optionnel)</span>
								</Label>
								<Input
									value={newLexiconEntry.usage}
									onChange={(e) =>
										setNewLexiconEntry((p) => ({
											...p,
											usage: e.target.value,
										}))
									}
									placeholder="Ex : salutation matinale"
									className="h-7 text-xs"
								/>
							</div>
							<Button
								size="sm"
								onClick={handleAddLexiconPhrase}
								disabled={!canAddLexicon}
								className="w-full h-7 text-[11px]"
							>
								<Plus className="h-3 w-3 mr-1" />
								Ajouter au lexique
							</Button>
						</div>
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
