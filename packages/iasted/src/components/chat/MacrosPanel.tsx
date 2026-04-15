/**
 * MacrosPanel — sélecteur de macros / quick-replies pour agent.
 *
 * Phase 3 approach : le composant est data-source-agnostic. Les macros sont
 * passées en props par le consumer. Le schema Convex `orgIAstedConfig` n'a
 * pas encore de champ `macros` (confirmé par exploration Phase 3) ; tant que
 * ce n'est pas ajouté, le consumer peut passer `macros=[]` et le panel
 * affichera un empty state "Aucune macro configurée".
 *
 * Variables templating :
 * - Substitue `{prenom}`, `{ville}`, `{service}` via `variables` prop.
 * - Le consumer est responsable de peupler les variables depuis la fiche citoyen.
 *
 * UX :
 * - Déclenché par `/` dans le composer ou via trigger custom (Popover).
 * - Fuzzy search via @workspace/ui/Command.
 * - Keyboard : flèches + Enter.
 *
 * NE DÉPEND PAS d'un prompt LLM — uniquement affichage texte interpolé.
 */

"use client";

import { useMemo } from "react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@workspace/ui/components/command";
import { cn } from "@workspace/ui/lib/utils";

export interface MacroEntry {
	/** ID unique (slug). */
	id: string;
	/** Label affiché dans la liste. */
	label: string;
	/** Contenu textuel avec placeholders `{var}`. */
	content: string;
	/** Catégorie facultative (pour regroupement). */
	category?: string;
	/** Fréquence d'usage (pour tri, optionnel). */
	usageCount?: number;
}

export interface MacrosPanelProps {
	macros: MacroEntry[];
	/** Variables à substituer dans le contenu avant injection. */
	variables?: Record<string, string | undefined>;
	/** Handler : reçoit le texte final interpolé. */
	onSelect: (content: string, macro: MacroEntry) => void;
	/** Placeholder du champ de recherche. */
	searchPlaceholder?: string;
	/** Classes custom. */
	className?: string;
}

function interpolate(template: string, variables: Record<string, string | undefined>): string {
	return template.replace(/\{(\w+)\}/g, (_, key) => {
		const value = variables[key];
		return value ?? `{${key}}`;
	});
}

export function MacrosPanel({
	macros,
	variables = {},
	onSelect,
	searchPlaceholder = "Rechercher une réponse rapide…",
	className,
}: MacrosPanelProps) {
	// Tri : catégorie asc, puis usageCount desc
	const grouped = useMemo(() => {
		const copy = [...macros].sort((a, b) => {
			const catA = a.category ?? "";
			const catB = b.category ?? "";
			if (catA !== catB) return catA.localeCompare(catB);
			return (b.usageCount ?? 0) - (a.usageCount ?? 0);
		});
		const out = new Map<string, MacroEntry[]>();
		for (const m of copy) {
			const key = m.category ?? "Général";
			const bucket = out.get(key) ?? [];
			bucket.push(m);
			out.set(key, bucket);
		}
		return out;
	}, [macros]);

	return (
		<Command className={cn("rounded-lg", className)}>
			<CommandInput placeholder={searchPlaceholder} />
			<CommandList className="max-h-64">
				<CommandEmpty>
					<div className="px-3 py-4 text-center">
						<p className="text-xs font-medium text-muted-foreground">
							{macros.length === 0
								? "Aucune macro configurée"
								: "Aucun résultat"}
						</p>
						{macros.length === 0 && (
							<p className="mt-1 text-[10px] text-muted-foreground/70">
								Demandez à votre administrateur de configurer des réponses rapides
								dans l'espace backoffice.
							</p>
						)}
					</div>
				</CommandEmpty>
				{Array.from(grouped.entries()).map(([category, entries]) => (
					<CommandGroup key={category} heading={category}>
						{entries.map((macro) => {
							const preview = interpolate(macro.content, variables);
							return (
								<CommandItem
									key={macro.id}
									value={`${macro.label} ${macro.content}`}
									onSelect={() => onSelect(preview, macro)}
									className="flex flex-col items-start gap-0.5"
								>
									<span className="text-xs font-semibold text-foreground">
										{macro.label}
									</span>
									<span className="line-clamp-2 text-[10px] font-medium text-muted-foreground">
										{preview}
									</span>
								</CommandItem>
							);
						})}
					</CommandGroup>
				))}
			</CommandList>
		</Command>
	);
}
