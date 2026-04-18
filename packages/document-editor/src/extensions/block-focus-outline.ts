/**
 * Extension Tiptap — contour visuel du bloc top-level contenant la
 * sélection courante. Inspiré de l'UX Apple Pages / Adobe Acrobat PDF
 * Editor : un cadre pointillé `--primary` autour du paragraphe / table /
 * placeholder actif pour indiquer ce que les commandes vont affecter.
 *
 * Implémentation : un plugin ProseMirror qui retourne une `Decoration.node`
 * sur le bloc de profondeur 1 contenant `selection.$from`. Recalculée à
 * chaque transaction via `apply(tr, old, oldState, newState)`.
 *
 * Le style lui-même est défini en CSS dans `globals.css` — recherche
 * `.ProseMirror .has-block-focus` :
 *
 *   .ProseMirror .has-block-focus {
 *     outline: 1.5px dashed var(--primary);
 *     outline-offset: 4px;
 *     border-radius: 6px;
 *     transition: outline-color 120ms;
 *   }
 *
 * `outline` (et non `border`) garantit qu'aucun reflow ne se produit
 * quand la décoration s'applique / se retire.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const BlockFocusOutline = Extension.create({
	name: "blockFocusOutline",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("block-focus-outline"),
				props: {
					decorations(state) {
						const { $from, empty } = state.selection;
						// Profondeur 0 = curseur au niveau du doc lui-même → rien à
						// décorer (éviterait d'entourer tout le document).
						if ($from.depth < 1) return DecorationSet.empty;

						// On cible le parent IMMÉDIAT du caret (paragraphe courant,
						// heading courant, cellule de table courante) plutôt que le
						// nœud de profondeur 1 — sinon un curseur dans une cellule
						// de table verrait toute la table entourée, et un curseur
						// dans un paragraphe top-level pouvait englober tout le doc
						// si la résolution retournait des positions de bordure.
						const blockStart = $from.before();
						const blockEnd = $from.after();

						// Garde-fou : si la décoration couvrirait 80 % ou plus du
						// doc, on abandonne — c'est le symptôme d'un cas limite
						// (curseur tombé à profondeur 0 après une transaction).
						const docSize = state.doc.content.size;
						if (docSize > 0 && blockEnd - blockStart >= docSize * 0.8) {
							return DecorationSet.empty;
						}

						// Le cadre visuel est géré par BlockSelectionFrame (React
						// portal) — on garde l'attribut data pour useEditorContext.
						const deco = Decoration.node(blockStart, blockEnd, {
							class: "has-block-focus",
							"data-block-focus": empty ? "caret" : "range",
						});
						return DecorationSet.create(state.doc, [deco]);
					},
				},
			}),
		];
	},
});
