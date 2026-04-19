/**
 * InlineMessageEditor — remplace `window.prompt()` pour l'édition inline d'un
 * message de chat. Pur composant de présentation : pas de dépendance Convex.
 *
 * Le parent fournit :
 *  - `initialValue` : le texte courant à éditer
 *  - `onSave(next)` : appelé avec la nouvelle valeur trimée (non-vide + différente)
 *  - `onCancel` : appelé sur Escape, clic "Annuler", ou save d'une valeur invalide
 *
 * Raccourcis clavier :
 *  - Enter (sans Shift) → enregistrer
 *  - Escape → annuler
 *  - Shift+Enter → saut de ligne (comme un composer standard)
 *
 * Le composant ne gère PAS son propre `isOpen` state — c'est au parent d'afficher
 * ou cacher l'éditeur (pattern contrôlé).
 */

import { useCallback, useState, type KeyboardEvent } from "react";

export interface InlineMessageEditorProps {
	initialValue: string;
	onSave: (newContent: string) => Promise<void> | void;
	onCancel: () => void;
	placeholder?: string;
	/** Classes pour le wrapper. */
	className?: string;
	/** Classes pour le textarea (taille, couleurs, font). */
	textareaClassName?: string;
	/** Classes communes aux boutons d'action. */
	buttonClassName?: string;
	/** Classes additionnelles pour le bouton primaire (save). */
	saveButtonClassName?: string;
	/** Classes additionnelles pour le bouton secondaire (cancel). */
	cancelButtonClassName?: string;
	autoFocus?: boolean;
	/** Nombre de lignes initial du textarea. */
	rows?: number;
	saveLabel?: string;
	cancelLabel?: string;
	/** Si true, affiche le hint "Entrée = enregistrer, Échap = annuler". */
	showKeyboardHint?: boolean;
}

export function InlineMessageEditor({
	initialValue,
	onSave,
	onCancel,
	placeholder,
	className,
	textareaClassName,
	buttonClassName,
	saveButtonClassName,
	cancelButtonClassName,
	autoFocus = true,
	rows = 2,
	saveLabel = "Enregistrer",
	cancelLabel = "Annuler",
	showKeyboardHint = true,
}: InlineMessageEditorProps) {
	const [value, setValue] = useState(initialValue);
	const [saving, setSaving] = useState(false);

	const trimmed = value.trim();
	const canSave = trimmed.length > 0 && trimmed !== initialValue;

	const handleSave = useCallback(async () => {
		if (!canSave || saving) return;
		setSaving(true);
		try {
			await onSave(trimmed);
		} finally {
			setSaving(false);
		}
	}, [canSave, saving, trimmed, onSave]);

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Escape") {
			e.preventDefault();
			onCancel();
		} else if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void handleSave();
		}
	};

	return (
		<div className={className}>
			<textarea
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				autoFocus={autoFocus}
				disabled={saving}
				rows={rows}
				className={textareaClassName}
			/>
			<div className="mt-1 flex items-center justify-end gap-1.5">
				{showKeyboardHint && (
					<span className="text-[9px] opacity-60 mr-auto">
						Entrée = enregistrer · Échap = annuler
					</span>
				)}
				<button
					type="button"
					onClick={onCancel}
					disabled={saving}
					className={[buttonClassName, cancelButtonClassName, "disabled:opacity-50"]
						.filter(Boolean)
						.join(" ")}
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					onClick={() => {
						void handleSave();
					}}
					disabled={!canSave || saving}
					className={[buttonClassName, saveButtonClassName, "disabled:opacity-40"]
						.filter(Boolean)
						.join(" ")}
				>
					{saving ? "…" : saveLabel}
				</button>
			</div>
		</div>
	);
}
