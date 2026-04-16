"use client";

/**
 * AI assistant drawer for template generation.
 *
 * Three-phase UX inspired by `apps/citizen-web/src/components/cv/CVAIDrawer.tsx`:
 *  - input    : textarea (free-form prompt) + optional file picker (PDF or
 *               image of an existing document) + template type select.
 *  - loading  : spinner + rotating hint while Gemini works.
 *  - result   : a read-only preview of the generated template + apply /
 *               regenerate buttons.
 *
 * The drawer is fully transport-agnostic — the parent injects:
 *  - `onUploadFile(file)` → Convex upload helper (returns fileUrl + mime)
 *  - `onGenerate(input)`  → calls the `templateAI.generateFromDocument` action
 *  - `onApply(result)`    → swaps the editor content + placeholders
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet";
import type {
	PlaceholderDescriptor,
	TiptapDocument,
} from "@workspace/document-rendering/types";
import { FileText, Image as ImageIcon, Loader2, Sparkles, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactElement } from "react";
import { useTranslation } from "react-i18next";

export type TemplateAITemplateType =
	| "certificate"
	| "attestation"
	| "receipt"
	| "letter"
	| "custom";

export interface TemplateAIInput {
	fileUrl?: string;
	fileMimeType?: string;
	prompt?: string;
	templateType?: TemplateAITemplateType;
	paperSize?: "A4" | "LETTER";
	language?: "fr" | "en";
}

export interface TemplateAIResult {
	document: TiptapDocument;
	placeholders: PlaceholderDescriptor[];
	suggestedName?: string;
	suggestedDescription?: string;
}

export interface TemplateAIDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Upload a file to storage and return its public URL + MIME type. */
	onUploadFile?: (file: File) => Promise<{ fileUrl: string; fileMimeType: string }>;
	/** Call the Convex action and return the validated AI result. */
	onGenerate: (input: TemplateAIInput) => Promise<TemplateAIResult>;
	/** Apply the generated document to the parent editor. */
	onApply: (result: TemplateAIResult) => void;
	/** Default template type pre-selected in the form. */
	defaultTemplateType?: TemplateAITemplateType;
	/** Default paper size to forward to the action (so the AI sizes content). */
	defaultPaperSize?: "A4" | "LETTER";
}

type Phase = "input" | "loading" | "result" | "error";

export function TemplateAIDrawer({
	open,
	onOpenChange,
	onUploadFile,
	onGenerate,
	onApply,
	defaultTemplateType = "attestation",
	defaultPaperSize = "A4",
}: TemplateAIDrawerProps): ReactElement {
	const { t, i18n } = useTranslation();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [phase, setPhase] = useState<Phase>("input");
	const [prompt, setPrompt] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [templateType, setTemplateType] =
		useState<TemplateAITemplateType>(defaultTemplateType);
	const [result, setResult] = useState<TemplateAIResult | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	function reset(): void {
		setPhase("input");
		setPrompt("");
		setFile(null);
		setTemplateType(defaultTemplateType);
		setResult(null);
		setErrorMessage(null);
	}

	function handleClose(next: boolean): void {
		if (!next) reset();
		onOpenChange(next);
	}

	function handleFile(event: ChangeEvent<HTMLInputElement>): void {
		const f = event.target.files?.[0] ?? null;
		event.target.value = "";
		setFile(f);
	}

	async function runGeneration(): Promise<void> {
		setPhase("loading");
		setErrorMessage(null);
		try {
			let fileUrl: string | undefined;
			let fileMimeType: string | undefined;
			if (file && onUploadFile) {
				const uploaded = await onUploadFile(file);
				fileUrl = uploaded.fileUrl;
				fileMimeType = uploaded.fileMimeType;
			}
			const lang = i18n.language.startsWith("en") ? "en" : "fr";
			const generated = await onGenerate({
				fileUrl,
				fileMimeType,
				prompt: prompt.trim() || undefined,
				templateType,
				paperSize: defaultPaperSize,
				language: lang,
			});
			setResult(generated);
			setPhase("result");
		} catch (err) {
			const msg = err instanceof Error ? err.message : t("templates.ai.errors.generic");
			setErrorMessage(msg);
			setPhase("error");
		}
	}

	function applyAndClose(): void {
		if (!result) return;
		onApply(result);
		handleClose(false);
	}

	const canSubmit = (prompt.trim().length > 0 || file !== null) && phase === "input";

	return (
		<Sheet open={open} onOpenChange={handleClose}>
			<SheetContent
				side="right"
				className="flex w-full flex-col gap-0 sm:max-w-xl"
			>
				<SheetHeader className="border-b">
					<SheetTitle className="flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-primary" />
						{t("templates.ai.drawer.title")}
					</SheetTitle>
					<p className="text-sm text-muted-foreground">
						{t("templates.ai.drawer.subtitle")}
					</p>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto p-4">
					{phase === "input" && (
						<InputForm
							prompt={prompt}
							onPromptChange={setPrompt}
							file={file}
							onPickFile={() => fileInputRef.current?.click()}
							onClearFile={() => setFile(null)}
							templateType={templateType}
							onTemplateTypeChange={setTemplateType}
							hasUpload={Boolean(onUploadFile)}
						/>
					)}
					{phase === "loading" && <LoadingState />}
					{phase === "result" && result && (
						<ResultPreview result={result} />
					)}
					{phase === "error" && (
						<div className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
							<div className="font-medium">{t("templates.ai.errors.title")}</div>
							<div className="text-destructive/80">{errorMessage}</div>
						</div>
					)}

					<input
						ref={fileInputRef}
						type="file"
						accept="application/pdf,image/png,image/jpeg,image/webp"
						hidden
						onChange={handleFile}
					/>
				</div>

				<footer className="flex items-center justify-end gap-2 border-t p-4">
					{phase === "input" && (
						<>
							<button
								type="button"
								onClick={() => handleClose(false)}
								className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
							>
								{t("templates.common.cancel")}
							</button>
							<button
								type="button"
								disabled={!canSubmit}
								onClick={runGeneration}
								className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
							>
								<Sparkles className="h-4 w-4" />
								{t("templates.ai.actions.generate")}
							</button>
						</>
					)}
					{phase === "loading" && (
						<button
							type="button"
							disabled
							className="inline-flex items-center gap-2 rounded-md bg-primary/40 px-3 py-2 text-sm font-medium text-primary-foreground"
						>
							<Loader2 className="h-4 w-4 animate-spin" />
							{t("templates.ai.phases.loading")}
						</button>
					)}
					{phase === "result" && result && (
						<>
							<button
								type="button"
								onClick={() => setPhase("input")}
								className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
							>
								{t("templates.ai.actions.regenerate")}
							</button>
							<button
								type="button"
								onClick={applyAndClose}
								className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
							>
								<Sparkles className="h-4 w-4" />
								{t("templates.ai.actions.apply")}
							</button>
						</>
					)}
					{phase === "error" && (
						<button
							type="button"
							onClick={() => setPhase("input")}
							className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
						>
							{t("templates.ai.actions.retry")}
						</button>
					)}
				</footer>
			</SheetContent>
		</Sheet>
	);
}

function InputForm({
	prompt,
	onPromptChange,
	file,
	onPickFile,
	onClearFile,
	templateType,
	onTemplateTypeChange,
	hasUpload,
}: {
	prompt: string;
	onPromptChange: (value: string) => void;
	file: File | null;
	onPickFile: () => void;
	onClearFile: () => void;
	templateType: TemplateAITemplateType;
	onTemplateTypeChange: (value: TemplateAITemplateType) => void;
	hasUpload: boolean;
}): ReactElement {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-4">
			<label className="flex flex-col gap-1 text-xs font-medium">
				{t("templates.ai.fields.templateType")}
				<select
					value={templateType}
					onChange={(e) =>
						onTemplateTypeChange(e.target.value as TemplateAITemplateType)
					}
					className="h-9 rounded-md border border-border bg-background px-2 text-sm"
				>
					<option value="certificate">{t("templates.type.certificate")}</option>
					<option value="attestation">{t("templates.type.attestation")}</option>
					<option value="receipt">{t("templates.type.receipt")}</option>
					<option value="letter">{t("templates.type.letter")}</option>
					<option value="custom">{t("templates.type.custom")}</option>
				</select>
			</label>

			<label className="flex flex-col gap-1 text-xs font-medium">
				{t("templates.ai.fields.prompt")}
				<textarea
					value={prompt}
					onChange={(e) => onPromptChange(e.target.value)}
					placeholder={t("templates.ai.fields.promptPlaceholder")}
					rows={5}
					className="rounded-md border border-border bg-background p-2 text-sm"
				/>
			</label>

			{hasUpload ? (
				<div className="flex flex-col gap-1 text-xs font-medium">
					{t("templates.ai.fields.sourceDocument")}
					{file ? (
						<div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2 text-sm">
							{file.type.startsWith("image/") ? (
								<ImageIcon className="h-4 w-4 text-muted-foreground" />
							) : (
								<FileText className="h-4 w-4 text-muted-foreground" />
							)}
							<span className="flex-1 truncate">{file.name}</span>
							<span className="text-xs text-muted-foreground">
								{(file.size / 1024).toFixed(0)} KB
							</span>
							<button
								type="button"
								onClick={onClearFile}
								className="text-xs text-muted-foreground hover:text-destructive"
							>
								{t("templates.common.cancel")}
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={onPickFile}
							className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
						>
							<Upload className="h-5 w-5" />
							<span>{t("templates.ai.fields.dropFile")}</span>
							<span className="text-[0.7em] text-muted-foreground/70">
								{t("templates.ai.fields.dropFileHint")}
							</span>
						</button>
					)}
				</div>
			) : null}
		</div>
	);
}

function LoadingState(): ReactElement {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
			<Sparkles className="h-8 w-8 animate-pulse text-primary" />
			<div className="text-sm font-medium">{t("templates.ai.phases.loading")}</div>
			<div className="max-w-xs text-xs text-muted-foreground">
				{t("templates.ai.phases.loadingHint")}
			</div>
		</div>
	);
}

function ResultPreview({ result }: { result: TemplateAIResult }): ReactElement {
	const { t } = useTranslation();
	const blockCount = result.document.content?.length ?? 0;
	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800/40 dark:bg-emerald-900/20">
				<div className="font-medium text-emerald-900 dark:text-emerald-200">
					{t("templates.ai.phases.resultTitle")}
				</div>
				<div className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-300/80">
					{t("templates.ai.phases.resultHint", {
						blocks: blockCount,
						placeholders: result.placeholders.length,
					})}
				</div>
			</div>

			{result.suggestedName ? (
				<div className="text-sm">
					<span className="text-muted-foreground">
						{t("templates.ai.fields.suggestedName")} :
					</span>{" "}
					<span className="font-medium">{result.suggestedName}</span>
				</div>
			) : null}

			{result.suggestedDescription ? (
				<div className="text-sm text-muted-foreground">
					{result.suggestedDescription}
				</div>
			) : null}

			{result.placeholders.length > 0 ? (
				<div className="flex flex-col gap-1">
					<div className="text-xs font-semibold text-muted-foreground uppercase">
						{t("templates.placeholders.title")}
					</div>
					<ul className="flex flex-wrap gap-1.5">
						{result.placeholders.map((p) => (
							<li
								key={p.key}
								className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
							>
								<code className="font-mono text-[0.85em]">{`{{${p.key}}}`}</code>
								{p.label.fr ? ` — ${p.label.fr}` : null}
								<span className="ml-1 text-muted-foreground">[{p.source}]</span>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}
