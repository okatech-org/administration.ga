"use client";

/**
 * UserLexiconPanel — Panneau de gestion du lexique personnel iAsted.
 *
 * Sprint 2 — E2 (Ronde 3) : extrait de `BackofficeSettingsTab.tsx` pour être
 * réutilisable dans les 3 surfaces (citizen-web / agent-web / backoffice-web).
 *
 * Affiche les 2 catégories d'entrées :
 *   1. **Expressions multilingues** — phrases dans une langue non maîtrisée
 *      par OpenAI (Téké, Fang, Punu, etc.), avec leur traduction française.
 *   2. **Prononciations corrigées** — entrées créées par le tool vocal
 *      `learn_pronunciation` (« ce nom se prononce X »). Affichées en
 *      lecture seule (suppression possible mais ajout via la voix uniquement).
 *
 * Le composant gère son propre état + ses propres requêtes Convex.
 * Aucune prop obligatoire — drop-in dans n'importe quelle page Réglages.
 */

import { api } from "@convex/_generated/api";
import {
	useMutation as useConvexMutation,
	useQuery as useConvexQuery,
} from "convex/react";
import { Languages, Mic, Plus, Trash2, Volume2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

interface LexiconRow {
	_id: string;
	expression: string;
	language: string;
	frenchTranslation: string;
	usage?: string;
	createdAt: number;
}

function extractConvexErrorMessage(e: unknown, fallback: string): string {
	if (typeof (e as { data?: unknown })?.data === "string")
		return (e as { data: string }).data;
	if (typeof (e as { message?: unknown })?.message === "string")
		return (e as { message: string }).message;
	return fallback;
}

interface UserLexiconPanelProps {
	/** Classe utilitaire optionnelle (defaults adaptés aux 3 surfaces). */
	className?: string;
}

export function UserLexiconPanel({ className }: UserLexiconPanelProps) {
	const lexicon = useConvexQuery(
		(api as any).ai.userLexicon.listMyLexicon,
		{},
	) as LexiconRow[] | undefined;
	const addPhrase = useConvexMutation(
		(api as any).ai.userLexicon.addPhrase,
	);
	const deletePhrase = useConvexMutation(
		(api as any).ai.userLexicon.deletePhrase,
	);

	const [draft, setDraft] = useState({
		expression: "",
		language: "",
		frenchTranslation: "",
		usage: "",
	});
	const canAdd =
		draft.expression.trim() &&
		draft.language.trim() &&
		draft.frenchTranslation.trim();

	const handleAdd = async () => {
		if (!canAdd) return;
		try {
			await addPhrase({
				expression: draft.expression,
				language: draft.language,
				frenchTranslation: draft.frenchTranslation,
				usage: draft.usage.trim() || undefined,
			});
			setDraft({
				expression: "",
				language: "",
				frenchTranslation: "",
				usage: "",
			});
			toast.success("Expression ajoutée au lexique personnel.");
		} catch (e) {
			toast.error(extractConvexErrorMessage(e, "Échec de l'ajout"));
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await deletePhrase({ id: id as never });
			toast.success("Expression supprimée.");
		} catch (e) {
			toast.error(extractConvexErrorMessage(e, "Échec de la suppression"));
		}
	};

	// Séparation visuelle : prononciations (corrigées par la voix) vs phrases.
	const phrases = (lexicon ?? []).filter((r) => r.language !== "pronunciation");
	const pronunciations = (lexicon ?? []).filter(
		(r) => r.language === "pronunciation",
	);

	return (
		<div className={className ?? "space-y-4"}>
			{/* Formulaire d'ajout d'une expression multilingue */}
			<div className="rounded-lg border p-3 space-y-3">
				<div className="flex items-center gap-2">
					<Languages className="h-4 w-4 text-muted-foreground" />
					<h4 className="text-sm font-medium">Enseigner une expression à iAsted</h4>
				</div>
				<p className="text-xs text-muted-foreground">
					Ajoutez une phrase dans une langue qu'iAsted ne maîtrise pas nativement
					(Téké, Fang, Punu, etc.) avec sa traduction française. Limite : 50 entrées.
				</p>
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1">
						<Label className="text-[11px]">Expression</Label>
						<Input
							value={draft.expression}
							onChange={(e) =>
								setDraft((d) => ({ ...d, expression: e.target.value }))
							}
							placeholder="Mbote na bino"
							className="h-8 text-xs"
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-[11px]">Langue</Label>
						<Input
							value={draft.language}
							onChange={(e) =>
								setDraft((d) => ({ ...d, language: e.target.value }))
							}
							placeholder="Lingala"
							className="h-8 text-xs"
						/>
					</div>
				</div>
				<div className="space-y-1">
					<Label className="text-[11px]">Traduction française</Label>
					<Input
						value={draft.frenchTranslation}
						onChange={(e) =>
							setDraft((d) => ({ ...d, frenchTranslation: e.target.value }))
						}
						placeholder="Bonjour à vous"
						className="h-8 text-xs"
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-[11px]">Contexte / usage (optionnel)</Label>
					<Input
						value={draft.usage}
						onChange={(e) => setDraft((d) => ({ ...d, usage: e.target.value }))}
						placeholder="Salutation formelle"
						className="h-8 text-xs"
					/>
				</div>
				<Button
					type="button"
					size="sm"
					onClick={handleAdd}
					disabled={!canAdd}
					className="w-full"
				>
					<Plus className="h-3.5 w-3.5 mr-1" />
					Ajouter au lexique
				</Button>
			</div>

			{/* Liste des expressions multilingues */}
			{phrases.length > 0 && (
				<div className="rounded-lg border p-3 space-y-2">
					<div className="flex items-center gap-2">
						<Volume2 className="h-4 w-4 text-muted-foreground" />
						<h4 className="text-sm font-medium">
							Expressions multilingues ({phrases.length})
						</h4>
					</div>
					<ul className="space-y-1.5">
						{phrases.map((row) => (
							<li
								key={row._id}
								className="flex items-start justify-between gap-2 text-xs"
							>
								<div className="flex-1 min-w-0">
									<div className="flex items-baseline gap-2 flex-wrap">
										<span className="font-medium">{row.expression}</span>
										<Badge variant="outline" className="text-[9px]">
											{row.language}
										</Badge>
									</div>
									<p className="text-muted-foreground italic">
										« {row.frenchTranslation} »
									</p>
									{row.usage && (
										<p className="text-[10px] text-muted-foreground/80 mt-0.5">
											{row.usage}
										</p>
									)}
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 shrink-0"
									onClick={() => handleDelete(row._id)}
									aria-label="Supprimer"
								>
									<Trash2 className="h-3 w-3" />
								</Button>
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Liste des prononciations corrigées par la voix */}
			{pronunciations.length > 0 && (
				<div className="rounded-lg border p-3 space-y-2">
					<div className="flex items-center gap-2">
						<Mic className="h-4 w-4 text-muted-foreground" />
						<h4 className="text-sm font-medium">
							Prononciations corrigées ({pronunciations.length})
						</h4>
					</div>
					<p className="text-[11px] text-muted-foreground">
						Ces corrections ont été enregistrées via la commande vocale «
						ce nom se prononce X ». iAsted les respectera dans toutes vos
						futures sessions.
					</p>
					<ul className="space-y-1.5">
						{pronunciations.map((row) => (
							<li
								key={row._id}
								className="flex items-start justify-between gap-2 text-xs"
							>
								<div className="flex-1 min-w-0">
									<p>
										<span className="font-medium">{row.expression}</span>
										<span className="text-muted-foreground"> se prononce </span>
										<span className="italic">« {row.frenchTranslation} »</span>
									</p>
									{row.usage && (
										<p className="text-[10px] text-muted-foreground/80 mt-0.5">
											{row.usage}
										</p>
									)}
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 shrink-0"
									onClick={() => handleDelete(row._id)}
									aria-label="Supprimer"
								>
									<Trash2 className="h-3 w-3" />
								</Button>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
