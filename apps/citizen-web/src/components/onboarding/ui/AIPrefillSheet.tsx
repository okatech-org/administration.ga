"use client";

import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
	ArrowRight,
	Check,
	FileText,
	Home,
	IdCard,
	Loader2,
	Shield,
	Sparkles,
	Upload,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OnboardingData } from "../types";
import {
	useAIPrefill,
	type AIScanFailedProps,
	type AIScanSuccessProps,
} from "../lib/useAIPrefill";

type DocKey = "passport" | "addressProof" | "birthCertificate";

const AI_DOC_KEYS: Array<{
	key: DocKey;
	icon: typeof IdCard;
}> = [
	{ key: "passport", icon: IdCard },
	{ key: "addressProof", icon: Home },
	{ key: "birthCertificate", icon: FileText },
];

const FIELD_KEYS: Array<keyof OnboardingData> = [
	"firstName",
	"lastName",
	"gender",
	"birthDate",
	"birthPlace",
	"birthCountry",
	"nationality",
	"nip",
	"passportNumber",
	"passportIssueDate",
	"passportExpiryDate",
	"passportIssuingAuthority",
	"maritalStatus",
	"fatherFirstName",
	"fatherLastName",
	"motherFirstName",
	"motherLastName",
	"spouseFirstName",
	"spouseLastName",
	"address",
];

function formatValue(key: keyof OnboardingData, value: unknown): string {
	if (key === "address" && value && typeof value === "object") {
		const a = value as { street?: string; city?: string; postalCode?: string };
		return [a.street, a.city, a.postalCode].filter(Boolean).join(", ");
	}
	return String(value ?? "");
}

export function AIPrefillSheet({
	open,
	onClose,
	onComplete,
	updateData,
	setFile,
	onScanSuccess,
	onScanFailed,
}: {
	open: boolean;
	onClose: () => void;
	onComplete?: () => void;
	updateData: (patch: Partial<OnboardingData>) => void;
	setFile?: (key: string, file: File) => void;
	onScanSuccess?: (props: AIScanSuccessProps) => void;
	onScanFailed?: (props: AIScanFailedProps) => void;
}) {
	const [files, setFiles] = useState<Partial<Record<DocKey, File>>>({});
	const [appliedPatch, setAppliedPatch] = useState<Partial<OnboardingData>>({});
	const inputRefs = useRef<Partial<Record<DocKey, HTMLInputElement | null>>>({});

	const { state, runOnFiles, reset } = useAIPrefill({
		onApply: (patch) => {
			setAppliedPatch(patch);
			updateData({ ...patch, _hasAIPrefill: true });
		},
		onScanSuccess,
		onScanFailed,
	});

	const filledCount = Object.values(files).filter(Boolean).length;
	const busy = state.status === "uploading" || state.status === "analyzing";
	const showDone = state.status === "success";

	const handleSelect = (key: DocKey, file: File | null) => {
		setFiles((prev) => {
			const next = { ...prev };
			if (file) next[key] = file;
			else delete next[key];
			return next;
		});
	};

	const handleAnalyze = () => {
		const uploaded = Object.values(files).filter((f): f is File => Boolean(f));
		runOnFiles(uploaded);

		if (setFile) {
			const existingNames: Record<string, string | undefined> = {};
			(Object.entries(files) as Array<[DocKey, File | undefined]>).forEach(
				([key, f]) => {
					if (f) {
						setFile(key, f);
						existingNames[key] = f.name;
					}
				},
			);
			if (Object.keys(existingNames).length > 0) {
				updateData({ documents: existingNames });
			}
		}
	};

	const handleClose = () => {
		setFiles({});
		setAppliedPatch({});
		reset();
		onClose();
	};

	const handleContinue = () => {
		onComplete?.();
		handleClose();
	};

	const [useSheet, setUseSheet] = useState(false);
	useEffect(() => {
		const mql = window.matchMedia("(max-width: 1023px)");
		const onChange = () => setUseSheet(mql.matches);
		onChange();
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	const body =
		state.status === "analyzing" ? (
			<AnalyzingStage files={files} />
		) : showDone ? (
			<DoneStage patch={appliedPatch} onContinue={handleContinue} />
		) : (
			<UploadStage
				files={files}
				filledCount={filledCount}
				busy={busy}
				errorMsg={state.status === "error" ? state.error : undefined}
				onSelect={handleSelect}
				onAnalyze={handleAnalyze}
				onClose={handleClose}
				inputRefs={inputRefs}
			/>
		);

	if (useSheet) {
		return (
			<BottomSheet
				open={open}
				onOpenChange={(o) => {
					if (!o) handleClose();
				}}
				maxHeight="92svh"
				maxWidthClass="max-w-[520px]"
				showCloseButton={false}
			>
				{body}
			</BottomSheet>
		);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!o) handleClose();
			}}
		>
			<DialogContent className="max-w-[520px] gap-0 p-0">{body}</DialogContent>
		</Dialog>
	);
}

function UploadStage({
	files,
	filledCount,
	busy,
	errorMsg,
	onSelect,
	onAnalyze,
	onClose,
	inputRefs,
}: {
	files: Partial<Record<DocKey, File>>;
	filledCount: number;
	busy: boolean;
	errorMsg?: string;
	onSelect: (key: DocKey, file: File | null) => void;
	onAnalyze: () => void;
	onClose: () => void;
	inputRefs: React.MutableRefObject<
		Partial<Record<DocKey, HTMLInputElement | null>>
	>;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-5 p-6">
			<header className="text-left">
				<div className="mb-2 flex items-center gap-2.5">
					<div className="flex size-8 items-center justify-center rounded-lg bg-gabon-blue-tint text-gabon-blue">
						<Sparkles className="size-4" />
					</div>
					<h2 className="text-xl font-semibold" suppressHydrationWarning>
						{t("onboarding.aiPrefill.upload.title")}
					</h2>
				</div>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.aiPrefill.upload.description")}
				</p>
			</header>

			<div className="flex flex-col gap-2.5">
				{AI_DOC_KEYS.map((doc) => {
					const file = files[doc.key];
					const Icon = doc.icon;
					return (
						<div key={doc.key}>
							<input
								ref={(el) => {
									inputRefs.current[doc.key] = el;
								}}
								type="file"
								accept="image/*,application/pdf,.pdf"
								className="hidden"
								onChange={(e) =>
									onSelect(doc.key, e.target.files?.[0] ?? null)
								}
							/>
							<button
								type="button"
								onClick={() => {
									if (file) onSelect(doc.key, null);
									else inputRefs.current[doc.key]?.click();
								}}
								className={cn(
									"flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left transition-colors",
									file
										? "border border-gabon-green bg-gabon-green-tint"
										: "border border-dashed border-border bg-card hover:bg-secondary",
								)}
							>
								<div
									className={cn(
										"flex size-10 shrink-0 items-center justify-center rounded-lg",
										file
											? "bg-gabon-green text-white"
											: "bg-secondary text-muted-foreground",
									)}
								>
									{file ? (
										<Check className="size-[18px]" strokeWidth={3} />
									) : (
										<Icon className="size-[18px]" />
									)}
								</div>
								<div className="min-w-0 flex-1">
									<div
										className="truncate text-sm font-medium"
										suppressHydrationWarning
									>
										{t(`onboarding.aiPrefill.docs.${doc.key}.label`)}
									</div>
									<div
										className="mt-0.5 truncate text-xs text-muted-foreground"
										suppressHydrationWarning
									>
										{file
											? file.name
											: t(`onboarding.aiPrefill.docs.${doc.key}.hint`)}
									</div>
								</div>
								{file ? (
									<X className="size-4 shrink-0 text-muted-foreground" />
								) : (
									<Upload className="size-4 shrink-0 text-muted-foreground" />
								)}
							</button>
						</div>
					);
				})}
			</div>

			<div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-xs text-muted-foreground">
				<Shield className="mt-0.5 size-3.5 shrink-0" />
				<span suppressHydrationWarning>
					{t("onboarding.aiPrefill.upload.privacy")}
				</span>
			</div>

			{errorMsg && (
				<p className="-mt-2 text-xs text-destructive">{errorMsg}</p>
			)}

			<div className="flex gap-2.5">
				<Button
					type="button"
					variant="ghost"
					className="flex-1 border border-border bg-transparent text-foreground hover:bg-secondary"
					onClick={onClose}
					disabled={busy}
				>
					<span suppressHydrationWarning>
						{t("onboarding.aiPrefill.buttons.later")}
					</span>
				</Button>
				<Button
					type="button"
					className="flex-1 bg-gabon-blue text-white hover:bg-gabon-blue-deep"
					onClick={onAnalyze}
					disabled={busy || filledCount === 0}
				>
					{busy ? (
						<>
							<Loader2 className="mr-1.5 size-4 animate-spin" />
							<span suppressHydrationWarning>
								{t("onboarding.aiPrefill.buttons.preparing")}
							</span>
						</>
					) : (
						<>
							<Sparkles className="mr-1.5 size-4" />
							<span suppressHydrationWarning>
								{t("onboarding.aiPrefill.buttons.analyze", {
									filled: filledCount,
									total: AI_DOC_KEYS.length,
								})}
							</span>
						</>
					)}
				</Button>
			</div>
		</div>
	);
}

function AnalyzingStage({ files }: { files: Partial<Record<DocKey, File>> }) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col items-center gap-4 p-10 text-center">
			<div className="relative size-24">
				<div
					className="absolute inset-0 animate-spin rounded-full"
					style={{
						border: "3px solid rgba(11, 79, 156, 0.12)",
						borderTopColor: "var(--gabon-blue-hex)",
					}}
				/>
				<div className="absolute inset-0 grid place-items-center text-gabon-blue">
					<Sparkles className="size-8" />
				</div>
			</div>
			<div>
				<h2 className="text-xl font-semibold" suppressHydrationWarning>
					{t("onboarding.aiPrefill.analyzing.title")}
				</h2>
				<p className="mt-2 text-sm text-muted-foreground" suppressHydrationWarning>
					{t("onboarding.aiPrefill.analyzing.description")}
				</p>
			</div>
			<div className="flex w-full max-w-[320px] flex-col gap-2">
				{AI_DOC_KEYS.filter((d) => files[d.key]).map((doc) => (
					<div
						key={doc.key}
						className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs"
					>
						<Sparkles className="size-3.5 shrink-0 text-gabon-blue" />
						<span className="flex-1 text-left font-medium" suppressHydrationWarning>
							{t(`onboarding.aiPrefill.docs.${doc.key}.label`)}
						</span>
						<span className="truncate text-muted-foreground">
							{files[doc.key]?.name}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function DoneStage({
	patch,
	onContinue,
}: {
	patch: Partial<OnboardingData>;
	onContinue: () => void;
}) {
	const { t } = useTranslation();
	const fieldLabels = useMemo<Partial<Record<keyof OnboardingData, string>>>(() => {
		const acc: Partial<Record<keyof OnboardingData, string>> = {};
		for (const k of FIELD_KEYS) {
			acc[k] = t(`onboarding.aiPrefill.fieldLabels.${k}`);
		}
		return acc;
	}, [t]);

	const entries = (Object.entries(patch) as Array<
		[keyof OnboardingData, unknown]
	>)
		.filter(([k]) => fieldLabels[k])
		.map(([k, v]) => ({ key: k, label: fieldLabels[k]!, value: formatValue(k, v) }))
		.filter((e) => e.value.length > 0);

	return (
		<div className="flex flex-col gap-5 p-6">
			<div className="flex items-center gap-3">
				<div className="flex size-11 items-center justify-center rounded-xl bg-gabon-green-tint text-gabon-green">
					<Check className="size-5" strokeWidth={3} />
				</div>
				<div>
					<h3 className="text-lg font-semibold" suppressHydrationWarning>
						{t("onboarding.aiPrefill.done.title")}
					</h3>
					<p className="mt-1 text-sm text-muted-foreground" suppressHydrationWarning>
						{entries.length > 1
							? t("onboarding.aiPrefill.done.descriptionMany", {
									count: entries.length,
								})
							: t("onboarding.aiPrefill.done.descriptionOne", {
									count: entries.length,
								})}
					</p>
				</div>
			</div>

			<div className="overflow-hidden rounded-xl border border-border">
				{entries.map((e, i) => (
					<div
						key={e.key}
						className={cn(
							"grid grid-cols-[1fr_1.2fr] gap-3 px-4 py-2.5 text-[13px]",
							i > 0 && "border-t border-border",
						)}
					>
						<span className="text-muted-foreground" suppressHydrationWarning>
							{e.label}
						</span>
						<span className="truncate font-medium">{e.value}</span>
					</div>
				))}
			</div>

			<p className="text-xs text-muted-foreground" suppressHydrationWarning>
				{t("onboarding.aiPrefill.done.note")}
			</p>

			<Button
				type="button"
				className="h-11 w-full bg-gabon-blue text-white hover:bg-gabon-blue-deep"
				onClick={onContinue}
			>
				<span suppressHydrationWarning>
					{t("onboarding.aiPrefill.buttons.continue")}
				</span>
				<ArrowRight className="ml-1 size-4" />
			</Button>
		</div>
	);
}
