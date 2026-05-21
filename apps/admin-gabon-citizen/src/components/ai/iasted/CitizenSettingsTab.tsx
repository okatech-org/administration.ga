/**
 * CitizenSettingsTab — Preferences iAsted pour citoyens.
 *
 * - Langue de l'interface (FR/EN via react-i18next)
 * - Langue de l'assistant vocal iAsted (15 langues, persistées dans
 *   `userIastedVoicePrefs.preferredLocale`)
 * - Notifications
 * - Version info
 *
 * Les deux langues sont **volontairement découplées** : un utilisateur
 * francophone à Madrid peut vouloir une UI en français mais parler à
 * l'assistant en espagnol pour traiter ses démarches locales.
 */

"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Bell, Info, Languages } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
	IASTED_SUPPORTED_LOCALES,
	DEFAULT_IASTED_LOCALE,
	type IastedLocale,
	type LocaleCategory,
} from "@workspace/iasted/locales";
import { Badge } from "@/components/ui/badge";
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

export function CitizenSettingsTab() {
	const { i18n } = useTranslation();
	const isEnglish = i18n.language === "en";

	// Préférences vocales iAsted (per-user, cross-org)
	const voicePrefs = useQuery(api.ai.voicePreferences.getMyVoicePreferences, {});
	const updateVoicePrefs = useMutation(api.ai.voicePreferences.updateMyVoicePreferences);
	const [voiceLocale, setVoiceLocale] = useState<string>(DEFAULT_IASTED_LOCALE);
	useEffect(() => {
		if (voicePrefs?.preferredLocale) {
			setVoiceLocale(voicePrefs.preferredLocale);
		}
	}, [voicePrefs?.preferredLocale]);

	const handleVoiceLocaleChange = async (next: string) => {
		setVoiceLocale(next);
		if (!voicePrefs) return;
		try {
			await updateVoicePrefs({
				voicePrefs: {
					preferredVoice: voicePrefs.preferredVoice,
					speechRate: voicePrefs.speechRate,
					pushToTalk: voicePrefs.pushToTalk,
					autoGreet: voicePrefs.autoGreet,
					customPersona: voicePrefs.customPersona,
					formality: voicePrefs.formality,
					preferredLocale: next,
					requireConfirmation: voicePrefs.requireConfirmation,
				},
			});
			toast.success("Langue de l'assistant enregistrée.");
		} catch (e: any) {
			toast.error(e?.message ?? "Échec de l'enregistrement");
		}
	};

	return (
		<ScrollArea className="flex-1 min-h-0">
			<div className="p-4 space-y-5">
				{/* Langue de l'interface */}
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						<Globe className="h-3.5 w-3.5" />
						Langue de l'interface
					</div>
					<div className="flex items-center justify-between rounded-lg border p-3">
						<div>
							<Label className="text-xs font-medium">English</Label>
							<p className="text-[10px] text-muted-foreground">Basculer en anglais</p>
						</div>
						<Switch
							checked={isEnglish}
							onCheckedChange={(checked) => {
								i18n.changeLanguage(checked ? "en" : "fr");
							}}
						/>
					</div>
				</div>

				{/* Langue de l'assistant vocal */}
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						<Languages className="h-3.5 w-3.5" />
						Assistant vocal iAsted
					</div>
					<div className="rounded-lg border p-3 space-y-2">
						<Label className="text-xs font-medium">Langue de conversation</Label>
						<Select value={voiceLocale} onValueChange={handleVoiceLocaleChange}>
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
						<p className="text-[10px] text-muted-foreground">
							Pilote la voix et la transcription. Prend effet à la prochaine
							session vocale. Indépendant de la langue de l'interface.
						</p>
					</div>
				</div>

				{/* Notifications */}
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						<Bell className="h-3.5 w-3.5" />
						Notifications
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between rounded-lg border p-3">
							<div>
								<Label className="text-xs font-medium">Appels entrants</Label>
								<p className="text-[10px] text-muted-foreground">Recevoir les notifications d'appels</p>
							</div>
							<Switch defaultChecked />
						</div>
						<div className="flex items-center justify-between rounded-lg border p-3">
							<div>
								<Label className="text-xs font-medium">Messages</Label>
								<p className="text-[10px] text-muted-foreground">Notifications de nouveaux messages</p>
							</div>
							<Switch defaultChecked />
						</div>
					</div>
				</div>

				{/* Info */}
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						<Info className="h-3.5 w-3.5" />
						A propos
					</div>
					<div className="rounded-lg border p-3 space-y-1">
						<p className="text-xs font-medium">iAsted v1.0</p>
						<p className="text-[10px] text-muted-foreground">
							Assistant Consulaire Intelligent — Gabon Diplomatie
						</p>
						<p className="text-[10px] text-muted-foreground/60">
							 2026 OkaTech / Digitalium
						</p>
					</div>
				</div>
			</div>
		</ScrollArea>
	);
}
