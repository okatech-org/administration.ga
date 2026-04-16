/**
 * Sidebar listing every placeholder declared on the template. Clicking
 * inserts a `{ type: "placeholder", attrs: {...} }` atom at the current cursor.
 * The editor stays as the single source of truth for the document JSON.
 */

import type { Editor } from "@tiptap/react";
import type { PlaceholderDescriptor, PlaceholderSource } from "@workspace/document-rendering/types";
import type { ReactElement } from "react";

const SOURCE_LABELS: Record<PlaceholderSource, string> = {
	user: "Utilisateur",
	profile: "Profil",
	request: "Demande",
	formData: "Formulaire",
	org: "Organisation",
	system: "Système",
};

export function PlaceholderPicker({
	editor,
	placeholders,
}: {
	editor: Editor | null;
	placeholders: PlaceholderDescriptor[];
}): ReactElement {
	const grouped = new Map<PlaceholderSource, PlaceholderDescriptor[]>();
	for (const p of placeholders) {
		const list = grouped.get(p.source) ?? [];
		list.push(p);
		grouped.set(p.source, list);
	}

	function insert(p: PlaceholderDescriptor): void {
		if (!editor) return;
		editor
			.chain()
			.focus()
			.insertContent({
				type: "placeholder",
				attrs: {
					key: p.key,
					source: p.source,
					label: p.label.fr,
				},
			})
			.run();
	}

	if (placeholders.length === 0) {
		return (
			<aside className="flex flex-col gap-2 rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
				<strong className="text-gray-900">Aucune variable configurée</strong>
				<p>
					Déclare les variables dynamiques du template dans la configuration pour pouvoir
					les insérer dans le texte.
				</p>
			</aside>
		);
	}

	return (
		<aside className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-3 text-sm">
			<header>
				<strong className="text-gray-900">Variables dynamiques</strong>
				<p className="mt-0.5 text-xs text-gray-500">
					Clique pour insérer au curseur. La valeur sera remplacée à la génération.
				</p>
			</header>
			<div className="flex flex-col gap-3">
				{Array.from(grouped.entries()).map(([source, list]) => (
					<section key={source} className="flex flex-col gap-1">
						<h4 className="text-[0.7rem] uppercase tracking-wide text-gray-500">
							{SOURCE_LABELS[source]}
						</h4>
						<ul className="flex flex-col gap-1">
							{list.map((p) => (
								<li key={p.key}>
									<button
										type="button"
										onClick={() => insert(p)}
										className="flex w-full items-center justify-between gap-2 rounded border border-gray-100 bg-gray-50 px-2 py-1 text-left hover:border-blue-200 hover:bg-blue-50"
									>
										<span className="font-medium text-gray-900">{p.label.fr}</span>
										<code className="text-xs text-gray-500">{`{{${p.key}}}`}</code>
									</button>
								</li>
							))}
						</ul>
					</section>
				))}
			</div>
		</aside>
	);
}
