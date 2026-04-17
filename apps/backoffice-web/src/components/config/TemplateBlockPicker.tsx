"use client";

/**
 * Picker réutilisable pour sélectionner une brique de template (Entête,
 * Typographie, Voix IA). Utilisé dans le wizard de création et dans la
 * sidebar d'édition d'un template existant.
 *
 * - Affiche les blocs globaux triés (défauts en premier).
 * - Option « Aucun — utiliser les réglages par défaut » toujours proposée
 *   (les briques sont optionnelles, cf. décision projet).
 * - Bouton « Créer une nouvelle brique » (ouvre l'URL fournie).
 */

import type { Id } from "@convex/_generated/dataModel";
import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type BlockId =
	| Id<"templateHeaderFooterBlocks">
	| Id<"templateTypographyBlocks">
	| Id<"templateVoiceBlocks">;

interface BlockOption {
	_id: BlockId;
	name: Record<string, string>;
	description?: Record<string, string>;
	isDefault?: boolean;
}

export interface TemplateBlockPickerProps {
	label: string;
	helpText?: string;
	blocks: BlockOption[] | undefined;
	value: BlockId | undefined;
	onChange: (next: BlockId | undefined) => void;
	createHref: string;
	emptyLabel?: string;
}

export function TemplateBlockPicker({
	label,
	helpText,
	blocks,
	value,
	onChange,
	createHref,
	emptyLabel = "Aucun — utiliser les réglages par défaut",
}: TemplateBlockPickerProps) {
	const sorted = [...(blocks ?? [])].sort((a, b) => {
		if (a.isDefault === b.isDefault) return 0;
		return a.isDefault ? -1 : 1;
	});

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<Label>{label}</Label>
				<Button variant="ghost" size="sm" asChild>
					<Link href={createHref}>
						<Plus className="mr-1 h-3.5 w-3.5" />
						Créer
					</Link>
				</Button>
			</div>
			{helpText ? (
				<p className="text-xs text-muted-foreground">{helpText}</p>
			) : null}

			<Select
				value={value ?? "__none__"}
				onValueChange={(v) => onChange(v === "__none__" ? undefined : (v as BlockId))}
			>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="__none__">
						<span className="text-muted-foreground">{emptyLabel}</span>
					</SelectItem>
					{sorted.map((b) => {
						const name = b.name.fr ?? b.name.en ?? "Sans nom";
						return (
							<SelectItem key={b._id} value={b._id as unknown as string}>
								<span className="flex items-center gap-2">
									{b.isDefault ? (
										<Sparkles className="h-3 w-3 text-emerald-600" />
									) : null}
									<span>{name}</span>
								</span>
							</SelectItem>
						);
					})}
				</SelectContent>
			</Select>
		</div>
	);
}
