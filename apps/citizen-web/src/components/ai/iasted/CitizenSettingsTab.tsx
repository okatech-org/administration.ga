/**
 * CitizenSettingsTab — Preferences iAsted pour citoyens.
 *
 * - Langue (francais/anglais)
 * - Notifications
 * - Version info
 */

import { Globe, Bell, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CitizenSettingsTab() {
	const { i18n } = useTranslation();
	const isEnglish = i18n.language === "en";

	return (
		<ScrollArea className="flex-1">
			<div className="p-4 space-y-5">
				{/* Langue */}
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						<Globe className="h-3.5 w-3.5" />
						Langue
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
