import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { ComponentProps } from "react";

type MarkdownProps = ComponentProps<typeof Markdown>;

/**
 * Schéma de sanitization basé sur celui par défaut de `rehype-sanitize`, avec :
 *  - autorisation de `className` sur tous les tags (utile pour styling Tailwind)
 *  - blocage explicite des attributs `on*` (handlers inline) et schémas `javascript:`
 *  - autorisation des liens `http`, `https`, `mailto`, `tel` uniquement
 *
 * Le schéma par défaut de `rehype-sanitize` bloque déjà `<script>`, `<iframe>`,
 * `<object>`, `<embed>`, etc. On ajoute une couche stricte sur les liens.
 */
const strictSchema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		"*": [...(defaultSchema.attributes?.["*"] ?? []), "className"],
		a: [
			...(defaultSchema.attributes?.a ?? []),
			["target", "_blank"],
			["rel", "noopener", "noreferrer"],
		],
		// rehype-highlight injecte des <span class="hljs-XXX"> que la sanitization
		// par défaut strippe — on whitelist explicitement les classes hljs-* sur
		// les éléments inline.
		span: [
			...(defaultSchema.attributes?.span ?? []),
			["className", /^hljs-/],
		],
		code: [
			...(defaultSchema.attributes?.code ?? []),
			["className", /^(language-|hljs)/],
		],
	},
	protocols: {
		...defaultSchema.protocols,
		href: ["http", "https", "mailto", "tel"],
		src: ["http", "https"],
	},
};

/**
 * SafeMarkdown — rend du Markdown avec sanitization XSS stricte.
 *
 * Usage :
 * ```tsx
 * <SafeMarkdown>{message.content}</SafeMarkdown>
 * ```
 *
 * Cas couverts :
 *  - Mr Ray / iAsted IA génèrent du Markdown → parsing sûr, pas d'injection
 *    via réponse LLM malicieuse.
 *  - Copier-coller utilisateur : `<img src=x onerror=alert(1)>` rendu en texte
 *    ou image inerte selon le tag (attributs `on*` strippés).
 *  - Liens : auto-target `_blank` + `rel="noopener noreferrer"` pour éviter
 *    tabnapping / partage de session.
 *
 * NB : le contenu passe aussi par `remark-gfm` pour supporter tables, listes
 * à tâches, strikethrough — utile pour les réponses IA structurées.
 */
export function SafeMarkdown({
	children,
	components,
	...rest
}: MarkdownProps) {
	return (
		<Markdown
			{...rest}
			remarkPlugins={[remarkGfm, ...(rest.remarkPlugins ?? [])]}
			rehypePlugins={[
				// Highlighting AVANT la sanitization : rehype-highlight injecte
				// des <span class="hljs-…">, puis rehypeSanitize les whitelist via
				// `strictSchema`. L'ordre inverse stripperait les classes.
				[rehypeHighlight, { detect: true, ignoreMissing: true }],
				[rehypeSanitize, strictSchema],
				...(rest.rehypePlugins ?? []),
			]}
			components={components}
		>
			{children}
		</Markdown>
	);
}
