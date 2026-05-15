"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type LocalizedString = { fr?: string; en?: string };

/**
 * Champ texte localisé FR/EN avec tabs internes. La valeur est toujours un
 * objet `{ fr?, en? }`. Pour un champ requis, FR est traité comme principal :
 * on n'envoie pas l'objet si FR est vide (le caller décide).
 */
export function LocalizedTextField({
	label,
	value,
	onChange,
	required,
	multiline,
	rows = 3,
	helpText,
}: {
	label: string;
	value: LocalizedString;
	onChange: (value: LocalizedString) => void;
	required?: boolean;
	multiline?: boolean;
	rows?: number;
	helpText?: string;
}) {
	const Field = multiline ? Textarea : Input;
	return (
		<div className="space-y-2">
			<Label className="text-sm font-medium">
				{label}
				{required && <span className="text-destructive"> *</span>}
			</Label>
			{helpText && (
				<p className="text-xs text-muted-foreground">{helpText}</p>
			)}
			<Tabs defaultValue="fr" className="w-full">
				<TabsList className="h-8">
					<TabsTrigger value="fr" className="text-xs">
						🇫🇷 Français
					</TabsTrigger>
					<TabsTrigger value="en" className="text-xs">
						🇬🇧 English
					</TabsTrigger>
				</TabsList>
				<TabsContent value="fr" className="mt-2">
					<Field
						value={value.fr ?? ""}
						onChange={(e) => onChange({ ...value, fr: e.target.value })}
						{...(multiline ? { rows } : {})}
					/>
				</TabsContent>
				<TabsContent value="en" className="mt-2">
					<Field
						value={value.en ?? ""}
						onChange={(e) => onChange({ ...value, en: e.target.value })}
						{...(multiline ? { rows } : {})}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}

/**
 * Liste répétable générique avec ajout, suppression, déplacement haut/bas.
 * `renderItem` reçoit l'élément, son index et un setter. `newItem` est appelé
 * pour créer un élément vide quand le user clique sur « Ajouter ».
 */
export function RepeatableList<T>({
	title,
	items,
	onChange,
	renderItem,
	newItem,
	addLabel = "Ajouter",
	emptyState,
}: {
	title?: string;
	items: T[];
	onChange: (items: T[]) => void;
	renderItem: (item: T, index: number, set: (next: T) => void) => ReactNode;
	newItem: () => T;
	addLabel?: string;
	emptyState?: string;
}) {
	const move = (from: number, to: number) => {
		if (to < 0 || to >= items.length) return;
		const next = [...items];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		onChange(next);
	};
	const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
	const setAt = (i: number, value: T) =>
		onChange(items.map((it, idx) => (idx === i ? value : it)));

	return (
		<div className="space-y-3">
			{title && <Label className="text-sm font-medium">{title}</Label>}
			{items.length === 0 ? (
				emptyState ? (
					<p className="rounded-md border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
						{emptyState}
					</p>
				) : null
			) : (
				<div className="space-y-3">
					{items.map((item, i) => (
						<div
							key={i}
							className="rounded-md border bg-background p-4 shadow-sm"
						>
							<div className="mb-3 flex items-center justify-between gap-2">
								<span className="text-xs font-mono text-muted-foreground">
									#{i + 1}
								</span>
								<div className="flex items-center gap-1">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-7"
										onClick={() => move(i, i - 1)}
										disabled={i === 0}
									>
										<ChevronUp className="size-3.5" />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-7"
										onClick={() => move(i, i + 1)}
										disabled={i === items.length - 1}
									>
										<ChevronDown className="size-3.5" />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-7 text-destructive hover:text-destructive"
										onClick={() => remove(i)}
									>
										<Trash2 className="size-3.5" />
									</Button>
								</div>
							</div>
							{renderItem(item, i, (next) => setAt(i, next))}
						</div>
					))}
				</div>
			)}
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => onChange([...items, newItem()])}
				className="gap-2"
			>
				<Plus className="size-3.5" />
				{addLabel}
			</Button>
		</div>
	);
}

/**
 * Liste répétable de strings localisés (use cases, etc.).
 */
export function LocalizedListField({
	label,
	items,
	onChange,
	addLabel,
	placeholder,
}: {
	label: string;
	items: LocalizedString[];
	onChange: (items: LocalizedString[]) => void;
	addLabel?: string;
	placeholder?: string;
}) {
	return (
		<RepeatableList<LocalizedString>
			title={label}
			items={items}
			onChange={onChange}
			addLabel={addLabel ?? "Ajouter une entrée"}
			newItem={() => ({ fr: "" })}
			renderItem={(item, _i, set) => (
				<LocalizedTextField
					label={placeholder ?? "Texte"}
					value={item}
					onChange={set}
					multiline
					rows={2}
				/>
			)}
		/>
	);
}
