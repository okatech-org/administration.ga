"use client";

import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "@/components/documents/ImageCropDialog";
import { cn } from "@/lib/utils";
import { PublicUserType } from "@convex/lib/constants";
import {
	Camera,
	Check,
	FileText,
	Home,
	IdCard,
	Info,
	Shield,
	Sparkles,
	Upload,
	X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OnboardingData } from "../types";

export type RegistrationFiles = Record<string, File | undefined>;

type DocIcon = "camera" | "id-card" | "file-text" | "home" | "shield";

type DocDef = {
	key: string;
	formats: string;
	max: string;
	required: boolean;
	icon: DocIcon;
	hintKey?: string;
	autoFilled?: boolean;
	accept: string;
	maxSizeBytes: number;
};

const MB = 1024 * 1024;

const ICON_COMPONENTS = {
	camera: Camera,
	"id-card": IdCard,
	"file-text": FileText,
	home: Home,
	shield: Shield,
} as const;

const DOCS_BY_TYPE: Record<string, DocDef[]> = {
	[PublicUserType.LongStay]: [
		{
			key: "identityPhoto",
			formats: "JPG, PNG",
			max: "20 MB",
			required: true,
			icon: "camera",
			autoFilled: false,
			accept: "image/jpeg,image/png",
			maxSizeBytes: 20 * MB,
		},
		{
			key: "passport",
			formats: "PDF, JPG",
			max: "5 MB",
			required: true,
			icon: "id-card",
			autoFilled: true,
			accept: "application/pdf,image/jpeg",
			maxSizeBytes: 5 * MB,
		},
		{
			key: "birthCertificate",
			formats: "PDF, JPG",
			max: "5 MB",
			required: true,
			icon: "file-text",
			autoFilled: true,
			accept: "application/pdf,image/jpeg",
			maxSizeBytes: 5 * MB,
		},
		{
			key: "addressProof",
			formats: "PDF, JPG",
			max: "5 MB",
			required: true,
			icon: "home",
			hintKey: "addressProof",
			autoFilled: true,
			accept: "application/pdf,image/jpeg",
			maxSizeBytes: 5 * MB,
		},
		{
			key: "residencePermit",
			formats: "PDF, JPG",
			max: "20 MB",
			required: false,
			icon: "shield",
			accept: "application/pdf,image/jpeg",
			maxSizeBytes: 20 * MB,
		},
	],
	[PublicUserType.ShortStay]: [
		{
			key: "identityPhoto",
			formats: "JPG, PNG",
			max: "20 MB",
			required: true,
			icon: "camera",
			accept: "image/jpeg,image/png",
			maxSizeBytes: 20 * MB,
		},
		{
			key: "passport",
			formats: "PDF, JPG",
			max: "5 MB",
			required: true,
			icon: "id-card",
			accept: "application/pdf,image/jpeg",
			maxSizeBytes: 5 * MB,
		},
	],
};

// Foreigner variants utilisent les mêmes docs que ShortStay
const FOREIGNER_DOCS = DOCS_BY_TYPE[PublicUserType.ShortStay];
for (const t of [
	PublicUserType.VisaTourism,
	PublicUserType.VisaBusiness,
	PublicUserType.VisaLongStay,
	PublicUserType.AdminServices,
]) {
	DOCS_BY_TYPE[t] = FOREIGNER_DOCS;
}

export function getDocsForUserType(userType: PublicUserType): DocDef[] {
	return DOCS_BY_TYPE[userType] ?? DOCS_BY_TYPE[PublicUserType.LongStay];
}

function DocumentCard({
	doc,
	filename,
	file,
	onFile,
	onRemove,
	hasAIPrefill,
}: {
	doc: DocDef;
	filename?: string;
	file?: File;
	onFile: (f: File) => void;
	onRemove: () => void;
	hasAIPrefill: boolean;
}) {
	const { t } = useTranslation();
	const inputRef = useRef<HTMLInputElement>(null);
	const [cropFile, setCropFile] = useState<File | null>(null);
	const Icon = ICON_COMPONENTS[doc.icon];
	const filled = Boolean(filename ?? file);
	const autoFilled = hasAIPrefill && doc.autoFilled && !filled;
	const isPhoto = doc.key === "identityPhoto";

	const triggerInput = () => inputRef.current?.click();

	const acceptFile = (f: File) => {
		if (f.size > doc.maxSizeBytes) {
			alert(t("onboarding.documents.tooLarge", { max: doc.max }));
			return;
		}
		if (isPhoto && f.type.startsWith("image/")) {
			setCropFile(f);
			return;
		}
		onFile(f);
	};

	const label = t(`onboarding.documents.docs.${doc.key}.label`);
	const hint = doc.hintKey
		? t(`onboarding.documents.docs.${doc.key}.hint`)
		: undefined;
	const formatLine = hint
		? t("onboarding.documents.formatLineWithHint", {
				formats: doc.formats,
				max: doc.max,
				hint,
			})
		: t("onboarding.documents.formatLine", {
				formats: doc.formats,
				max: doc.max,
			});

	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-xl border p-4 transition-colors",
				filled && "border-gabon-green bg-gabon-green-tint/40",
				!filled && autoFilled && "border-gabon-blue bg-gabon-blue-tint/40",
				!filled && !autoFilled && "border-border bg-card",
			)}
		>
			<div
				className={cn(
					"flex size-10 shrink-0 items-center justify-center rounded-lg",
					filled && "bg-gabon-green text-white",
					!filled && autoFilled && "bg-gabon-blue text-white",
					!filled && !autoFilled && "bg-secondary text-muted-foreground",
				)}
				aria-hidden="true"
			>
				{filled ? (
					<Check className="size-[18px]" strokeWidth={2.5} />
				) : autoFilled ? (
					<Sparkles className="size-[18px]" />
				) : (
					<Icon className="size-[18px]" />
				)}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 text-sm font-medium">
					<span suppressHydrationWarning>{label}</span>
					{doc.required && <span className="text-destructive">*</span>}
					{autoFilled && (
						<span
							className="inline-flex items-center gap-1 rounded-full bg-gabon-blue-tint px-1.5 py-0.5 text-[10px] font-medium text-gabon-blue"
							suppressHydrationWarning
						>
							{t("onboarding.documents.aiPrefilledBadge")}
						</span>
					)}
				</div>
				<p
					className="mt-0.5 truncate text-xs text-muted-foreground"
					suppressHydrationWarning
				>
					{filled ? (filename ?? file?.name ?? "") : formatLine}
				</p>
			</div>

			<input
				ref={inputRef}
				type="file"
				accept={doc.accept}
				className="hidden"
				onChange={(e) => {
					const f = e.target.files?.[0];
					if (!f) return;
					acceptFile(f);
					e.target.value = "";
				}}
			/>

			{filled ? (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-8 text-muted-foreground hover:text-destructive"
					onClick={onRemove}
					aria-label={t("onboarding.documents.buttons.removeAria")}
				>
					<X className="size-4" />
				</Button>
			) : (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 border border-border bg-transparent text-foreground hover:bg-secondary"
					onClick={triggerInput}
				>
					<Upload className="mr-1 size-3.5" />
					<span suppressHydrationWarning>
						{t("onboarding.documents.buttons.upload")}
					</span>
				</Button>
			)}

			{isPhoto && (
				<ImageCropDialog
					open={cropFile !== null}
					imageFile={cropFile}
					onClose={() => setCropFile(null)}
					onCropComplete={(cropped) => {
						setCropFile(null);
						onFile(cropped);
					}}
				/>
			)}
		</div>
	);
}

export function DocumentsStep({
	data,
	updateData,
	userType,
	files,
	setFile,
	removeFile,
	onDocumentUploaded,
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
	userType: PublicUserType;
	files: RegistrationFiles;
	setFile: (key: string, file: File) => void;
	removeFile: (key: string) => void;
	onDocumentUploaded?: (docKey: string) => void;
}) {
	const { t } = useTranslation();
	const docs = getDocsForUserType(userType);
	const documents = data.documents ?? {};
	const hasAIPrefill = Boolean(data._hasAIPrefill);

	const handleFile = (key: string, file: File) => {
		setFile(key, file);
		updateData({ documents: { ...documents, [key]: file.name } });
		onDocumentUploaded?.(key);
	};

	const handleRemove = (key: string) => {
		removeFile(key);
		const next = { ...documents };
		delete next[key];
		updateData({ documents: next });
	};

	return (
		<div className="flex flex-col gap-5">
			<header className="flex flex-col gap-2">
				<h1
					className="text-2xl font-semibold tracking-tight md:text-3xl"
					suppressHydrationWarning
				>
					{t("onboarding.documents.title")}
				</h1>
				<p className="text-sm text-muted-foreground" suppressHydrationWarning>
					{hasAIPrefill
						? t("onboarding.documents.subtitleWithAi")
						: t("onboarding.documents.subtitle")}
				</p>
			</header>

			<div className="flex flex-col gap-3">
				{docs.map((doc) => (
					<DocumentCard
						key={doc.key}
						doc={doc}
						filename={documents[doc.key]}
						file={files[doc.key]}
						onFile={(f) => handleFile(doc.key, f)}
						onRemove={() => handleRemove(doc.key)}
						hasAIPrefill={hasAIPrefill}
					/>
				))}
			</div>

			<div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
				<Info className="mt-0.5 size-3.5 shrink-0" />
				<span suppressHydrationWarning>{t("onboarding.documents.footer")}</span>
			</div>
		</div>
	);
}
