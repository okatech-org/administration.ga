/**
 * ConfigPanelShell — container 4-panneaux pour la configuration iAsted backoffice.
 *
 * Panneaux : Persona / Disponibilité / Outils / Escalade (chacun stub Phase 4).
 * Consommateurs : `apps/backoffice-web/src/components/admin/settings/sections/IAstedSection.tsx`.
 *
 * Chaque panel reçoit `orgId` via contexte implicite + des slots de contenu.
 */

"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";

export type ConfigPanelId = "persona" | "availability" | "tools" | "escalation";

export interface ConfigPanelTab {
	id: ConfigPanelId;
	label: string;
	description?: string;
}

const DEFAULT_PANELS: ConfigPanelTab[] = [
	{ id: "persona", label: "Persona", description: "Nom, ton, prompt, langues" },
	{ id: "availability", label: "Disponibilité", description: "Horaires et routage" },
	{ id: "tools", label: "Outils", description: "Whitelist / blacklist" },
	{ id: "escalation", label: "Escalade", description: "Handoff + sentiment" },
];

export interface ConfigPanelShellProps {
	/** Panneaux actifs (défaut : 4 panneaux). */
	panels?: ConfigPanelTab[];
	/** Panel actif par défaut. */
	defaultPanel?: ConfigPanelId;
	/** Contenu de chaque panel (clé = panel ID). */
	panelContent: Partial<Record<ConfigPanelId, ReactNode>>;
	/** Slot optionnel en haut du shell (ex : SandboxPreview, VersionHistory). */
	headerSlot?: ReactNode;
	/** Slot optionnel en bas (ex : FeatureFlagsPanel). */
	footerSlot?: ReactNode;
	className?: string;
}

export function ConfigPanelShell({
	panels = DEFAULT_PANELS,
	defaultPanel,
	panelContent,
	headerSlot,
	footerSlot,
	className,
}: ConfigPanelShellProps) {
	const [active, setActive] = useState<ConfigPanelId>(
		defaultPanel ?? (panels[0]?.id ?? "persona"),
	);

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{headerSlot && <div className="shrink-0">{headerSlot}</div>}

			{/* Tabs */}
			<div className="flex gap-1 rounded-xl bg-card p-1">
				{panels.map((panel) => {
					const isActive = panel.id === active;
					return (
						<button
							key={panel.id}
							type="button"
							onClick={() => setActive(panel.id)}
							aria-selected={isActive}
							className={cn(
								"flex flex-1 flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-center transition-colors active:scale-[0.98]",
								isActive
									? "bg-primary/10 text-primary"
									: "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
							)}
						>
							<span className="text-xs font-bold">{panel.label}</span>
							{panel.description && (
								<span className="text-[10px] font-medium opacity-70">
									{panel.description}
								</span>
							)}
						</button>
					);
				})}
			</div>

			{/* Active panel content */}
			<div className="rounded-xl bg-card p-4">
				{panelContent[active] ?? <PanelPlaceholder panelId={active} />}
			</div>

			{footerSlot && <div className="shrink-0">{footerSlot}</div>}
		</div>
	);
}

function PanelPlaceholder({ panelId }: { panelId: ConfigPanelId }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
			<p className="text-sm font-medium text-muted-foreground">
				Panneau « {panelId} » à venir
			</p>
			<p className="text-[10px] text-muted-foreground/70">
				Configuration détaillée : éditeur de persona, validators Convex, preview live.
			</p>
		</div>
	);
}
