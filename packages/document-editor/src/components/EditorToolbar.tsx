/**
 * Minimal floating toolbar: block-level + inline marks + alignment.
 *
 * Not intended to be beautiful yet — Phase 1.E/F will polish. Just enough to
 * prove the editor works end-to-end with the server renderer.
 */

import type { Editor } from "@tiptap/react";
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	Bold,
	Italic,
	List,
	ListOrdered,
	Minus,
	Quote,
	Redo,
	Strikethrough,
	Underline as UnderlineIcon,
	Undo,
} from "lucide-react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

type ToolbarAction = {
	icon: ReactElement;
	label: string;
	isActive?: boolean;
	onClick: () => void;
	disabled?: boolean;
};

export function EditorToolbar({ editor }: { editor: Editor | null }): ReactElement | null {
	const { t } = useTranslation();

	if (!editor) return null;

	const actions: ToolbarAction[][] = [
		[
			{
				icon: <Bold size={16} />,
				label: t("templates.editor.toolbar.bold"),
				isActive: editor.isActive("bold"),
				onClick: () => editor.chain().focus().toggleBold().run(),
			},
			{
				icon: <Italic size={16} />,
				label: t("templates.editor.toolbar.italic"),
				isActive: editor.isActive("italic"),
				onClick: () => editor.chain().focus().toggleItalic().run(),
			},
			{
				icon: <UnderlineIcon size={16} />,
				label: t("templates.editor.toolbar.underline"),
				isActive: editor.isActive("underline"),
				onClick: () => editor.chain().focus().toggleUnderline().run(),
			},
			{
				icon: <Strikethrough size={16} />,
				label: t("templates.editor.toolbar.strike"),
				isActive: editor.isActive("strike"),
				onClick: () => editor.chain().focus().toggleStrike().run(),
			},
		],
		[
			{
				icon: <AlignLeft size={16} />,
				label: t("templates.editor.toolbar.alignLeft"),
				isActive: editor.isActive({ textAlign: "left" }),
				onClick: () => editor.chain().focus().setTextAlign("left").run(),
			},
			{
				icon: <AlignCenter size={16} />,
				label: t("templates.editor.toolbar.alignCenter"),
				isActive: editor.isActive({ textAlign: "center" }),
				onClick: () => editor.chain().focus().setTextAlign("center").run(),
			},
			{
				icon: <AlignRight size={16} />,
				label: t("templates.editor.toolbar.alignRight"),
				isActive: editor.isActive({ textAlign: "right" }),
				onClick: () => editor.chain().focus().setTextAlign("right").run(),
			},
			{
				icon: <AlignJustify size={16} />,
				label: t("templates.editor.toolbar.alignJustify"),
				isActive: editor.isActive({ textAlign: "justify" }),
				onClick: () => editor.chain().focus().setTextAlign("justify").run(),
			},
		],
		[
			{
				icon: <List size={16} />,
				label: t("templates.editor.toolbar.bulletList"),
				isActive: editor.isActive("bulletList"),
				onClick: () => editor.chain().focus().toggleBulletList().run(),
			},
			{
				icon: <ListOrdered size={16} />,
				label: t("templates.editor.toolbar.orderedList"),
				isActive: editor.isActive("orderedList"),
				onClick: () => editor.chain().focus().toggleOrderedList().run(),
			},
			{
				icon: <Quote size={16} />,
				label: t("templates.editor.toolbar.quote"),
				isActive: editor.isActive("blockquote"),
				onClick: () => editor.chain().focus().toggleBlockquote().run(),
			},
			{
				icon: <Minus size={16} />,
				label: t("templates.editor.toolbar.horizontalRule"),
				onClick: () => editor.chain().focus().setHorizontalRule().run(),
			},
		],
		[
			{
				icon: <Undo size={16} />,
				label: t("templates.editor.toolbar.undo"),
				onClick: () => editor.chain().focus().undo().run(),
				disabled: !editor.can().undo(),
			},
			{
				icon: <Redo size={16} />,
				label: t("templates.editor.toolbar.redo"),
				onClick: () => editor.chain().focus().redo().run(),
				disabled: !editor.can().redo(),
			},
		],
	];

	return (
		<div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1 text-foreground">
			{actions.map((group, gi) => (
				<div
					key={gi}
					className="flex items-center gap-0.5 border-r border-border/60 pr-1 last:border-r-0"
				>
					{group.map((a) => (
						<button
							key={a.label}
							type="button"
							onClick={a.onClick}
							disabled={a.disabled}
							title={a.label}
							aria-label={a.label}
							data-active={a.isActive ? "true" : undefined}
							className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
						>
							{a.icon}
						</button>
					))}
				</div>
			))}
		</div>
	);
}
