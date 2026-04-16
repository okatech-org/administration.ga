/**
 * Sidebar listing every placeholder declared on the template. Clicking
 * inserts a `{ type: "placeholder", attrs: {...} }` atom at the current cursor.
 * The editor stays as the single source of truth for the document JSON.
 */

import type { Editor } from "@tiptap/react";
import type { PlaceholderDescriptor, PlaceholderSource } from "@workspace/document-rendering/types";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

export function PlaceholderPicker({
	editor,
	placeholders,
}: {
	editor: Editor | null;
	placeholders: PlaceholderDescriptor[];
}): ReactElement {
	const { t } = useTranslation();

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
			<aside className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
				<strong className="text-foreground">{t("templates.placeholders.picker.emptyTitle")}</strong>
				<p>{t("templates.placeholders.picker.emptyHint")}</p>
			</aside>
		);
	}

	return (
		<aside className="flex flex-col gap-3 rounded-md border border-border bg-card p-3 text-sm text-foreground">
			<header>
				<strong>{t("templates.placeholders.picker.header")}</strong>
				<p className="mt-0.5 text-xs text-muted-foreground">
					{t("templates.placeholders.picker.instructions")}
				</p>
			</header>
			<div className="flex flex-col gap-3">
				{Array.from(grouped.entries()).map(([source, list]) => (
					<section key={source} className="flex flex-col gap-1">
						<h4 className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
							{t(`templates.placeholders.sources.${source}`)}
						</h4>
						<ul className="flex flex-col gap-1">
							{list.map((p) => (
								<li key={p.key}>
									<button
										type="button"
										onClick={() => insert(p)}
										className="flex w-full items-center justify-between gap-2 rounded border border-border bg-background px-2 py-1 text-left hover:border-primary/40 hover:bg-primary/5"
									>
										<span className="font-medium">{p.label.fr}</span>
										<code className="text-xs text-muted-foreground">{`{{${p.key}}}`}</code>
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
