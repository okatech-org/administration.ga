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

type ToolbarAction = {
	icon: ReactElement;
	label: string;
	isActive?: boolean;
	onClick: () => void;
	disabled?: boolean;
};

export function EditorToolbar({ editor }: { editor: Editor | null }): ReactElement | null {
	if (!editor) return null;

	const actions: ToolbarAction[][] = [
		[
			{
				icon: <Bold size={16} />,
				label: "Bold",
				isActive: editor.isActive("bold"),
				onClick: () => editor.chain().focus().toggleBold().run(),
			},
			{
				icon: <Italic size={16} />,
				label: "Italic",
				isActive: editor.isActive("italic"),
				onClick: () => editor.chain().focus().toggleItalic().run(),
			},
			{
				icon: <UnderlineIcon size={16} />,
				label: "Underline",
				isActive: editor.isActive("underline"),
				onClick: () => editor.chain().focus().toggleUnderline().run(),
			},
			{
				icon: <Strikethrough size={16} />,
				label: "Strike",
				isActive: editor.isActive("strike"),
				onClick: () => editor.chain().focus().toggleStrike().run(),
			},
		],
		[
			{
				icon: <AlignLeft size={16} />,
				label: "Left",
				isActive: editor.isActive({ textAlign: "left" }),
				onClick: () => editor.chain().focus().setTextAlign("left").run(),
			},
			{
				icon: <AlignCenter size={16} />,
				label: "Center",
				isActive: editor.isActive({ textAlign: "center" }),
				onClick: () => editor.chain().focus().setTextAlign("center").run(),
			},
			{
				icon: <AlignRight size={16} />,
				label: "Right",
				isActive: editor.isActive({ textAlign: "right" }),
				onClick: () => editor.chain().focus().setTextAlign("right").run(),
			},
			{
				icon: <AlignJustify size={16} />,
				label: "Justify",
				isActive: editor.isActive({ textAlign: "justify" }),
				onClick: () => editor.chain().focus().setTextAlign("justify").run(),
			},
		],
		[
			{
				icon: <List size={16} />,
				label: "Bullet list",
				isActive: editor.isActive("bulletList"),
				onClick: () => editor.chain().focus().toggleBulletList().run(),
			},
			{
				icon: <ListOrdered size={16} />,
				label: "Ordered list",
				isActive: editor.isActive("orderedList"),
				onClick: () => editor.chain().focus().toggleOrderedList().run(),
			},
			{
				icon: <Quote size={16} />,
				label: "Quote",
				isActive: editor.isActive("blockquote"),
				onClick: () => editor.chain().focus().toggleBlockquote().run(),
			},
			{
				icon: <Minus size={16} />,
				label: "Horizontal rule",
				onClick: () => editor.chain().focus().setHorizontalRule().run(),
			},
		],
		[
			{
				icon: <Undo size={16} />,
				label: "Undo",
				onClick: () => editor.chain().focus().undo().run(),
				disabled: !editor.can().undo(),
			},
			{
				icon: <Redo size={16} />,
				label: "Redo",
				onClick: () => editor.chain().focus().redo().run(),
				disabled: !editor.can().redo(),
			},
		],
	];

	return (
		<div className="flex flex-wrap items-center gap-1 rounded-md border border-gray-200 bg-white p-1">
			{actions.map((group, gi) => (
				<div key={gi} className="flex items-center gap-0.5 border-r border-gray-100 pr-1 last:border-r-0">
					{group.map((a) => (
						<button
							key={a.label}
							type="button"
							onClick={a.onClick}
							disabled={a.disabled}
							title={a.label}
							aria-label={a.label}
							data-active={a.isActive ? "true" : undefined}
							className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700"
						>
							{a.icon}
						</button>
					))}
				</div>
			))}
		</div>
	);
}
