/**
 * Extensions Tiptap minimales pour l'édition des zones d'entête et de pied
 * de page. On volontairement exclut :
 *
 *   - BlockDragHandle / BlockFocusOutline : header/footer ne sont pas des
 *     zones de réorganisation de blocs. L'utilisateur n'a pas besoin de
 *     déplacer le paragraphe "AMBASSADE DU GABON" par drag-and-drop.
 *   - TableKit : pas de tableaux dans un pied de page.
 *   - PlaceholderNode / ImagePlaceholderNode / SignaturePlaceholderNode :
 *     le header utilise le branding de la représentation (résolu au rendu
 *     PDF), pas les placeholders dynamiques du document.
 *   - StarterKit.heading / bulletList / orderedList / codeBlock : ces
 *     structures n'ont pas de sens dans une bande d'entête ou de pied.
 *
 * Conserve : paragraphes, inline marks (bold, italic), text-align,
 * text-style + color + font-family + font-size pour personnaliser
 * l'apparence institutionnelle (police Optima par défaut).
 */

import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { StarterKit } from "@tiptap/starter-kit";
import { FontSize } from "@workspace/document-rendering/extensions";

function buildCommonHeaderFooterExtensions() {
	return [
		StarterKit.configure({
			heading: false,
			bulletList: false,
			orderedList: false,
			listItem: false,
			codeBlock: false,
			blockquote: false,
			horizontalRule: false,
		}),
		TextAlign.configure({ types: ["paragraph"] }),
		TextStyle,
		Color,
		FontFamily,
		FontSize,
	];
}

export function buildHeaderEditorExtensions() {
	return buildCommonHeaderFooterExtensions();
}

export function buildFooterEditorExtensions() {
	return buildCommonHeaderFooterExtensions();
}
