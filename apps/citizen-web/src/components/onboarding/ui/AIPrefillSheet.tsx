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
import { useEffect, useRef, useState } from "react";
import type { OnboardingData } from "../types";
import { useAIPrefill } from "../lib/useAIPrefill";

type DocKey = "passport" | "addressProof" | "birthCertificate";

const AI_DOCS: Array<{
	key: DocKey;
	label: string;
	hint: string;
	icon: typeof IdCard;
}> = [
	{
		key: "passport",
		label: "Passeport",
		hint: "Page d'identification",
		icon: IdCard,
	},
	{
		key: "addressProof",
		label: "Justificatif de domicile",
		hint: "Facture, quittance…",
		icon: Home,
	},
	{
		key: "birthCertificate",
		label: "Acte de naissance",
		hint: "Document officiel",
		icon: FileText,
	},
];

const FIELD_LABELS: Partial<Record<keyof OnboardingData, string>> = {
	firstName: "Prénom",
	lastName: "Nom",
	gender: "Genre",
	birthDate: "Date de naissance",
	birthPlace: "Lieu de naissance",
	birthCountry: "Pays de naissance",
	nationality: "Nationalité",
	nip: "NIP",
	passportNumber: "N° passeport",
	passportIssueDate: "Délivré le",
	passportExpiryDate: "Expire le",
	passportIssuingAuthority: "Autorité de délivrance",
	maritalStatus: "Statut matrimonial",
	fatherFirstName: "Prénom du père",
	fatherLastName: "Nom du père",
	motherFirstName: "Prénom de la mère",
	motherLastName: "Nom de la mère",
	spouseFirstName: "Prénom du conjoint",
	spouseLastName: "Nom du conjoint",
	address: "Adresse",
};

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
}: {
	open: boolean;
	onClose: () => void;
	onComplete?: () => void;
	updateData: (patch: Partial<OnboardingData>) => void;
	setFile?: (key: string, file: File) => void;
}) {
	const [files, setFiles] = useState<Partial<Record<DocKey, File>>>({});
	const [appliedPatch, setAppliedPatch] = useState<Partial<OnboardingData>>({});
	const inputRefs = useRef<Partial<Record<DocKey, HTMLInputElement | null>>>({});

	const { state, runOnFiles, reset } = useAIPrefill({
		onApply: (patch) => {
			setAppliedPatch(patch);
			updateData({ ...patch, _hasAIPrefill: true });
		},
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

		// Persiste les fichiers dans le state global de l'onboarding pour qu'ils
		// soient retrouvés à l'étape "Documents". Map des slots AI vers les keys
		// de DocumentsStep (identiques par convention).
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

	// BottomSheet en dessous de `lg` (1024px) — desktop wizard apparaît à
	// partir de cette taille, donc tablet → BottomSheet aussi.
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
	return (
		<div className="flex flex-col gap-5 p-6">
			<header className="text-left">
				<div className="mb-2 flex items-center gap-2.5">
					<div className="flex size-8 items-center justify-center rounded-lg bg-gabon-blue-tint text-gabon-blue">
						<Sparkles className="size-4" />
					</div>
					<h2 className="text-xl font-semibold">
						Pré-remplir avec mes documents
					</h2>
				</div>
				<p className="text-sm text-muted-foreground">
					Téléversez ces documents et l'IA remplira automatiquement vos
					informations d'identité, de passeport et d'adresse. Tous les champs
					resteront modifiables.
				</p>
			</header>

			<div className="flex flex-col gap-2.5">
				{AI_DOCS.map((doc) => {
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
									<div className="truncate text-sm font-medium">
										{doc.label}
									</div>
									<div className="mt-0.5 truncate text-xs text-muted-foreground">
										{file ? file.name : doc.hint}
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
				<span>
					Vos documents sont chiffrés et utilisés uniquement pour le
					pré-remplissage. Aucune copie n'est conservée par l'IA.
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
					Plus tard
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
							Préparation…
						</>
					) : (
						<>
							<Sparkles className="mr-1.5 size-4" />
							Analyser ({filledCount}/{AI_DOCS.length})
						</>
					)}
				</Button>
			</div>
		</div>
	);
}

function AnalyzingStage({ files }: { files: Partial<Record<DocKey, File>> }) {
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
				<h2 className="text-xl font-semibold">Analyse en cours…</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Nous extrayons les informations de vos documents pour pré-remplir le
					formulaire.
				</p>
			</div>
			<div className="flex w-full max-w-[320px] flex-col gap-2">
				{AI_DOCS.filter((d) => files[d.key]).map((doc) => (
					<div
						key={doc.key}
						className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs"
					>
						<Sparkles className="size-3.5 shrink-0 text-gabon-blue" />
						<span className="flex-1 text-left font-medium">{doc.label}</span>
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
	const entries = (Object.entries(patch) as Array<
		[keyof OnboardingData, unknown]
	>)
		.filter(([k]) => FIELD_LABELS[k])
		.map(([k, v]) => ({ key: k, label: FIELD_LABELS[k]!, value: formatValue(k, v) }))
		.filter((e) => e.value.length > 0);

	return (
		<div className="flex flex-col gap-5 p-6">
			<div className="flex items-center gap-3">
				<div className="flex size-11 items-center justify-center rounded-xl bg-gabon-green-tint text-gabon-green">
					<Check className="size-5" strokeWidth={3} />
				</div>
				<div>
					<h3 className="text-lg font-semibold">Pré-remplissage réussi</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						{entries.length} champ{entries.length > 1 ? "s ont" : " a"} été
						rempli{entries.length > 1 ? "s" : ""} automatiquement.
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
						<span className="text-muted-foreground">{e.label}</span>
						<span className="truncate font-medium">{e.value}</span>
					</div>
				))}
			</div>

			<p className="text-xs text-muted-foreground">
				Vous pourrez vérifier et modifier ces informations dans les prochaines
				étapes.
			</p>

			<Button
				type="button"
				className="h-11 w-full bg-gabon-blue text-white hover:bg-gabon-blue-deep"
				onClick={onContinue}
			>
				Continuer le formulaire
				<ArrowRight className="ml-1 size-4" />
			</Button>
		</div>
	);
}
