"use client";

import {
	Award,
	FileBadge,
	FileText,
	Layers,
	type LucideIcon,
	Receipt,
	Send,
	Sparkle,
} from "lucide-react";
import {
	SUBFOLDER_META,
	SUBFOLDER_ORDER,
	type TemplateSubfolder,
} from "@/lib/templates/categorize";
import { cn } from "@/lib/utils";
import type {
	SubfolderFilter,
	TemplateTypeFilter,
} from "@/hooks/useTemplatesFilter";

interface TemplatesSidebarProps {
	subfolder: SubfolderFilter;
	onSubfolderChange: (v: SubfolderFilter) => void;
	templateType: TemplateTypeFilter;
	onTemplateTypeChange: (v: TemplateTypeFilter) => void;
	totalCount: number;
	countsBySubfolder: Record<TemplateSubfolder, number>;
	countsByType: Record<Exclude<TemplateTypeFilter, "all">, number>;
}

interface TypeMeta {
	key: Exclude<TemplateTypeFilter, "all">;
	label: string;
	icon: LucideIcon;
}

const TYPE_META: TypeMeta[] = [
	{ key: "certificate", label: "Certificats", icon: Award },
	{ key: "attestation", label: "Attestations", icon: FileBadge },
	{ key: "letter", label: "Lettres / Notes", icon: Send },
	{ key: "receipt", label: "Récépissés", icon: Receipt },
	{ key: "custom", label: "Personnalisés", icon: Sparkle },
];

/**
 * Sidebar des filtres de la bibliothèque globale de modèles.
 *
 * Organisation :
 *   - « Tous les modèles » (bouton plein)
 *   - Sous-dossiers (6 entrées, compteurs dynamiques)
 *   - Type de modèle (5 entrées, compteurs dynamiques)
 *
 * Les compteurs sont calculés en excluant le filtre pour lequel ils sont
 * affichés (ex : un compteur par sous-dossier reflète le filtre search+type
 * mais pas subfolder), ce qui permet à l'utilisateur de visualiser
 * immédiatement ce que chaque choix va produire.
 */
export function TemplatesSidebar({
	subfolder,
	onSubfolderChange,
	templateType,
	onTemplateTypeChange,
	totalCount,
	countsBySubfolder,
	countsByType,
}: TemplatesSidebarProps) {
	const allSelected = subfolder === "all" && templateType === "all";

	function resetAll() {
		onSubfolderChange("all");
		onTemplateTypeChange("all");
	}

	return (
		<aside className="flex flex-col gap-6 rounded-xl bg-secondary p-4 text-sm">
			<SidebarButton
				icon={Layers}
				label="Tous les modèles"
				count={totalCount}
				active={allSelected}
				onClick={resetAll}
			/>

			<Section title="Sous-dossiers">
				{SUBFOLDER_ORDER.map((key) => {
					const meta = SUBFOLDER_META[key];
					return (
						<SidebarButton
							key={key}
							icon={meta.icon}
							label={meta.shortLabel}
							count={countsBySubfolder[key]}
							active={subfolder === key}
							onClick={() => onSubfolderChange(key)}
							dim={countsBySubfolder[key] === 0}
						/>
					);
				})}
			</Section>

			<Section title="Type de modèle">
				<SidebarButton
					icon={FileText}
					label="Tous les types"
					count={Object.values(countsByType).reduce((a, b) => a + b, 0)}
					active={templateType === "all"}
					onClick={() => onTemplateTypeChange("all")}
				/>
				{TYPE_META.map((t) => (
					<SidebarButton
						key={t.key}
						icon={t.icon}
						label={t.label}
						count={countsByType[t.key]}
						active={templateType === t.key}
						onClick={() => onTemplateTypeChange(t.key)}
						dim={countsByType[t.key] === 0}
					/>
				))}
			</Section>
		</aside>
	);
}

// ─── Sous-composants ────────────────────────────────────────────────────

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{title}
			</h3>
			<div className="flex flex-col gap-0.5">{children}</div>
		</div>
	);
}

function SidebarButton({
	icon: Icon,
	label,
	count,
	active,
	onClick,
	dim = false,
}: {
	icon: LucideIcon;
	label: string;
	count: number;
	active: boolean;
	onClick: () => void;
	dim?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
				active
					? "bg-foreground/10 font-medium text-foreground"
					: "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
				dim && !active && "opacity-50",
			)}
			aria-pressed={active}
		>
			<Icon className="h-4 w-4 shrink-0" />
			<span className="flex-1 truncate">{label}</span>
			<span
				className={cn(
					"rounded px-1.5 py-0.5 text-xs tabular-nums",
					active
						? "bg-foreground/15 text-foreground"
						: "bg-foreground/5 text-muted-foreground group-hover:bg-foreground/10",
				)}
			>
				{count}
			</span>
		</button>
	);
}
