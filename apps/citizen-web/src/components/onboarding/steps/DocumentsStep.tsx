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
import type { OnboardingData } from "../types";

export type RegistrationFiles = Record<string, File | undefined>;

type DocIcon = "camera" | "id-card" | "file-text" | "home" | "shield";

type DocDef = {
	key: string;
	label: string;
	formats: string;
	max: string;
	required: boolean;
	icon: DocIcon;
	hint?: string;
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
			label: "Photo d'identité",
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
			label: "Passeport",
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
			label: "Acte de naissance",
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
			label: "Justificatif de domicile",
			formats: "PDF, JPG",
			max: "5 MB",
			required: true,
			icon: "home",
			hint: "Moins de 3 mois",
			autoFilled: true,
			accept: "application/pdf,image/jpeg",
			maxSizeBytes: 5 * MB,
		},
		{
			key: "residencePermit",
			label: "Titre de séjour",
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
			label: "Photo d'identité",
			formats: "JPG, PNG",
			max: "20 MB",
			required: true,
			icon: "camera",
			accept: "image/jpeg,image/png",
			maxSizeBytes: 20 * MB,
		},
		{
			key: "passport",
			label: "Passeport",
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
	const inputRef = useRef<HTMLInputElement>(null);
	const [cropFile, setCropFile] = useState<File | null>(null);
	const Icon = ICON_COMPONENTS[doc.icon];
	const filled = Boolean(filename ?? file);
	const autoFilled = hasAIPrefill && doc.autoFilled && !filled;
	const isPhoto = doc.key === "identityPhoto";

	const triggerInput = () => inputRef.current?.click();

	const acceptFile = (f: File) => {
		if (f.size > doc.maxSizeBytes) {
			alert(`Le fichier dépasse la taille maximale (${doc.max}).`);
			return;
		}
		if (isPhoto && f.type.startsWith("image/")) {
			setCropFile(f);
			return;
		}
		onFile(f);
	};

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
					{doc.label}
					{doc.required && <span className="text-destructive">*</span>}
					{autoFilled && (
						<span className="inline-flex items-center gap-1 rounded-full bg-gabon-blue-tint px-1.5 py-0.5 text-[10px] font-medium text-gabon-blue">
							Pré-rempli IA
						</span>
					)}
				</div>
				<p className="mt-0.5 truncate text-xs text-muted-foreground">
					{filled
						? (filename ?? file?.name ?? "")
						: `${doc.formats} · max ${doc.max}${doc.hint ? " · " + doc.hint : ""}`}
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
					aria-label="Supprimer le document"
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
					Téléverser
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
}: {
	data: OnboardingData;
	updateData: (patch: Partial<OnboardingData>) => void;
	userType: PublicUserType;
	files: RegistrationFiles;
	setFile: (key: string, file: File) => void;
	removeFile: (key: string) => void;
}) {
	const docs = getDocsForUserType(userType);
	const documents = data.documents ?? {};
	const hasAIPrefill = Boolean(data._hasAIPrefill);

	const handleFile = (key: string, file: File) => {
		setFile(key, file);
		updateData({ documents: { ...documents, [key]: file.name } });
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
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Pièces justificatives
				</h1>
				<p className="text-sm text-muted-foreground">
					{hasAIPrefill
						? "Certains documents ont déjà été récupérés depuis le pré-remplissage IA."
						: "Téléversez les pièces requises pour votre dossier."}
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
				<span>
					Vos documents sont stockés de manière chiffrée et accessibles
					uniquement par les agents consulaires habilités.
				</span>
			</div>
		</div>
	);
}
