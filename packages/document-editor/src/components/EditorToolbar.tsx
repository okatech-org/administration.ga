/**
 * Rich-text toolbar for the template editor.
 *
 * Groups (left → right):
 *  1. Block format : paragraph + headings 1-3
 *  2. Inline marks : bold / italic / underline / strike
 *  3. Color : foreground colour picker (textStyle mark)
 *  4. Typography : font family + font size (textStyle marks)
 *  5. Alignment : left / center / right / justify
 *  6. Lists / quote / hr
 *  7. Image upload (only when `onUploadImage` is provided)
 *  8. History : undo / redo
 *
 * The toolbar is keyboard-accessible (each button is a real <button> with a
 * discoverable label) and degrades gracefully if the editor is null.
 */

import type { Editor } from "@tiptap/react";
import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	Bold,
	Image as ImageIcon,
	Italic,
	List,
	ListOrdered,
	Loader2,
	Minus,
	Palette,
	Quote,
	Redo,
	Strikethrough,
	Type,
	Underline as UnderlineIcon,
	Undo,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactElement } from "react";
import { useTranslation } from "react-i18next";

type ToolbarAction = {
	icon: ReactElement;
	label: string;
	isActive?: boolean;
	onClick: () => void;
	disabled?: boolean;
};

/** Predefined font sizes (pt) shown in the picker. */
const FONT_SIZES = [9, 10, 11, 12, 14, 16, 18, 24, 32, 48] as const;

/** Predefined font families. PDF-safe (matches the renderer fallback). */
const FONT_FAMILIES = [
	{ value: "", labelKey: "templates.editor.toolbar.fontDefault" },
	{ value: "Helvetica", labelKey: "templates.editor.toolbar.fontHelvetica" },
	{ value: "Times-Roman", labelKey: "templates.editor.toolbar.fontTimes" },
	{ value: "Courier", labelKey: "templates.editor.toolbar.fontCourier" },
] as const;

/** Predefined text colours. The first one (empty) clears the colour. */
const TEXT_COLORS = [
	{ value: "", swatch: "transparent" },
	{ value: "#1F1F1F", swatch: "#1F1F1F" },
	{ value: "#4A5563", swatch: "#4A5563" },
	{ value: "#1D4ED8", swatch: "#1D4ED8" },
	{ value: "#15803D", swatch: "#15803D" },
	{ value: "#B91C1C", swatch: "#B91C1C" },
	{ value: "#B45309", swatch: "#B45309" },
	{ value: "#7C3AED", swatch: "#7C3AED" },
] as const;

export interface EditorToolbarProps {
	editor: Editor | null;
	/** When provided, exposes the "insert image" button. */
	onUploadImage?: (file: File) => Promise<{ src: string; storageId?: string }>;
}

export function EditorToolbar({
	editor,
	onUploadImage,
}: EditorToolbarProps): ReactElement | null {
	const { t } = useTranslation();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);

	if (!editor) return null;
	// Capture in a non-nullable const so closures preserve the narrowing.
	const ed = editor;

	const currentFontSize =
		(ed.getAttributes("textStyle")?.fontSize as number | undefined) ??
		undefined;
	const currentFontFamily =
		(ed.getAttributes("textStyle")?.fontFamily as string | undefined) ??
		"";
	const currentColor =
		(ed.getAttributes("textStyle")?.color as string | undefined) ?? "";

	function setBlockFormat(value: string): void {
		if (value === "paragraph") {
			ed.chain().focus().setParagraph().run();
		} else if (value === "h1" || value === "h2" || value === "h3") {
			const level = Number(value.slice(1)) as 1 | 2 | 3;
			ed.chain().focus().toggleHeading({ level }).run();
		}
	}

	function setFontSize(size: string): void {
		if (!size) {
			ed.chain().focus().setMark("textStyle", { fontSize: null }).run();
			return;
		}
		ed.chain().focus().setMark("textStyle", { fontSize: Number(size) }).run();
	}

	function setFontFamily(family: string): void {
		if (!family) {
			ed.chain().focus().unsetFontFamily().run();
			return;
		}
		ed.chain().focus().setFontFamily(family).run();
	}

	function setColor(color: string): void {
		if (!color) {
			ed.chain().focus().unsetColor().run();
			return;
		}
		ed.chain().focus().setColor(color).run();
	}

	async function handleFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
		const file = event.target.files?.[0];
		event.target.value = ""; // allow re-selecting the same file
		if (!file || !onUploadImage) return;
		setUploading(true);
		try {
			const { src, storageId } = await onUploadImage(file);
			ed.chain()
				.focus()
				.insertContent({
					type: "image",
					attrs: { src, storageId, width: "60%", align: "center" },
				})
				.run();
		} finally {
			setUploading(false);
		}
	}

	const currentBlock = editor.isActive("heading", { level: 1 })
		? "h1"
		: editor.isActive("heading", { level: 2 })
			? "h2"
			: editor.isActive("heading", { level: 3 })
				? "h3"
				: "paragraph";

	const inlineMarks: ToolbarAction[] = [
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
	];

	const alignMarks: ToolbarAction[] = [
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
	];

	const blockMarks: ToolbarAction[] = [
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
	];

	const historyMarks: ToolbarAction[] = [
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
	];

	return (
		<div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1 text-foreground">
			{/* Block format */}
			<div className="flex items-center gap-0.5 border-r border-border/60 pr-1">
				<select
					value={currentBlock}
					onChange={(e) => setBlockFormat(e.target.value)}
					aria-label={t("templates.editor.toolbar.blockFormat")}
					className="h-7 rounded border border-transparent bg-transparent px-1.5 text-xs hover:border-border focus:border-primary focus:outline-none"
				>
					<option value="paragraph">{t("templates.editor.toolbar.paragraph")}</option>
					<option value="h1">{t("templates.editor.toolbar.heading1")}</option>
					<option value="h2">{t("templates.editor.toolbar.heading2")}</option>
					<option value="h3">{t("templates.editor.toolbar.heading3")}</option>
				</select>
			</div>

			{/* Inline marks */}
			<ToolbarGroup actions={inlineMarks} />

			{/* Color picker */}
			<div className="flex items-center gap-0.5 border-r border-border/60 pr-1">
				<ColorMenu
					currentColor={currentColor}
					onPick={setColor}
					label={t("templates.editor.toolbar.textColor")}
				/>
			</div>

			{/* Typography */}
			<div className="flex items-center gap-1 border-r border-border/60 pr-1">
				<Type size={14} className="text-muted-foreground" />
				<select
					value={currentFontFamily}
					onChange={(e) => setFontFamily(e.target.value)}
					aria-label={t("templates.editor.toolbar.fontFamily")}
					className="h-7 max-w-[120px] rounded border border-transparent bg-transparent px-1.5 text-xs hover:border-border focus:border-primary focus:outline-none"
				>
					{FONT_FAMILIES.map((f) => (
						<option key={f.value} value={f.value}>
							{t(f.labelKey)}
						</option>
					))}
				</select>
				<select
					value={currentFontSize ? String(currentFontSize) : ""}
					onChange={(e) => setFontSize(e.target.value)}
					aria-label={t("templates.editor.toolbar.fontSize")}
					className="h-7 w-14 rounded border border-transparent bg-transparent px-1.5 text-xs hover:border-border focus:border-primary focus:outline-none"
				>
					<option value="">—</option>
					{FONT_SIZES.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>
			</div>

			{/* Alignment */}
			<ToolbarGroup actions={alignMarks} />

			{/* Block marks */}
			<ToolbarGroup actions={blockMarks} />

			{/* Image upload */}
			{onUploadImage ? (
				<div className="flex items-center gap-0.5 border-r border-border/60 pr-1">
					<input
						type="file"
						accept="image/png,image/jpeg,image/webp"
						ref={fileInputRef}
						onChange={handleFile}
						hidden
					/>
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={uploading}
						title={t("templates.editor.toolbar.insertImage")}
						aria-label={t("templates.editor.toolbar.insertImage")}
						className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
					>
						{uploading ? (
							<Loader2 size={16} className="animate-spin" />
						) : (
							<ImageIcon size={16} />
						)}
					</button>
				</div>
			) : null}

			{/* History */}
			<ToolbarGroup actions={historyMarks} last />
		</div>
	);
}

function ToolbarGroup({
	actions,
	last,
}: {
	actions: ToolbarAction[];
	last?: boolean;
}): ReactElement {
	return (
		<div
			className={`flex items-center gap-0.5 ${last ? "" : "border-r border-border/60 pr-1"}`}
		>
			{actions.map((a) => (
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
	);
}

function ColorMenu({
	currentColor,
	onPick,
	label,
}: {
	currentColor: string;
	onPick: (color: string) => void;
	label: string;
}): ReactElement {
	const [open, setOpen] = useState(false);
	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				title={label}
				aria-label={label}
				aria-haspopup="menu"
				aria-expanded={open}
				className="flex h-7 items-center gap-1 rounded px-1.5 hover:bg-muted"
			>
				<Palette size={16} />
				<span
					className="h-3 w-3 rounded-sm border border-border/60"
					style={{ backgroundColor: currentColor || "transparent" }}
				/>
			</button>
			{open ? (
				<div
					role="menu"
					className="absolute left-0 top-full z-50 mt-1 grid grid-cols-4 gap-1 rounded-md border border-border bg-popover p-2 shadow-lg"
					onMouseLeave={() => setOpen(false)}
				>
					{TEXT_COLORS.map((c) => (
						<button
							key={c.value}
							type="button"
							onClick={() => {
								onPick(c.value);
								setOpen(false);
							}}
							title={c.value || "Default"}
							className="h-6 w-6 rounded-sm border border-border/60 hover:scale-110"
							style={{
								backgroundColor: c.swatch,
								backgroundImage:
									c.swatch === "transparent"
										? "linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd)"
										: undefined,
								backgroundSize: c.swatch === "transparent" ? "8px 8px" : undefined,
								backgroundPosition:
									c.swatch === "transparent" ? "0 0, 4px 4px" : undefined,
							}}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}
