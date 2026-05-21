"use client";

/**
 * Wizard de création d'un modèle global en 5 étapes.
 *
 *   1. Identité & diffusion  : nom, type, catégorie, scope (all/orgTypes)
 *   2. Entête, logo, pied    : édition inline de la facette `headerFooter`
 *   3. Structure des textes  : édition inline de la facette `typography`
 *   4. Logique argumentaire  : édition inline de la facette `voice`
 *   5. Récapitulatif         : visualise les choix avant création
 *
 * À la soumission, un seul `documentTemplates.create` est émis avec les 3
 * facettes empaquetées — le contenu Tiptap se rédige ensuite sur la page
 * d'édition.
 */

import { api } from "@convex/_generated/api";
import { ServiceCategory } from "@convex/lib/constants";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	FilePlus,
	LayoutTemplate,
	MessageSquareQuote,
	Palette,
	Type,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	ApplicabilityPicker,
	type Applicability,
} from "@/components/config/ApplicabilityPicker";
import {
	HeaderFooterSectionEditor,
	type HeaderFooterSectionValue,
	createDefaultHeaderFooterSection,
	serializeHeaderFooterSection,
} from "@/components/config/HeaderFooterSectionEditor";
import {
	TypographySectionEditor,
	type TypographySectionValue,
	createDefaultTypographySection,
	serializeTypographySection,
} from "@/components/config/TypographySectionEditor";
import {
	VoiceSectionEditor,
	type VoiceSectionValue,
	createDefaultVoiceSection,
	serializeVoiceSection,
} from "@/components/config/VoiceSectionEditor";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

type TemplateType = "certificate" | "attestation" | "receipt" | "letter" | "custom";
type Step = 1 | 2 | 3 | 4 | 5;

const TEMPLATE_TYPES: TemplateType[] = [
	"certificate",
	"attestation",
	"receipt",
	"letter",
	"custom",
];

export default function NewGlobalTemplatePage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [step, setStep] = useState<Step>(1);
	const [isPending, setIsPending] = useState(false);

	// ─── Étape 1 : identité & diffusion ─────────────────────────────────
	const [nameFr, setNameFr] = useState("");
	const [descFr, setDescFr] = useState("");
	const [templateType, setTemplateType] = useState<TemplateType>("attestation");
	const [category, setCategory] = useState<string>(ServiceCategory.Certification);
	const [paperSize, setPaperSize] = useState<"A4" | "LETTER">("A4");
	const [orientation, setOrientation] = useState<"portrait" | "landscape">(
		"portrait",
	);
	const [autoPublishToCitizen, setAutoPublish] = useState(true);
	const [requireSignature, setRequireSignature] = useState(false);
	const [applicability, setApplicability] = useState<Applicability>("all");
	const [applicableOrgTypes, setApplicableOrgTypes] = useState<string[]>([]);

	// ─── Étapes 2 / 3 / 4 : facettes inline ─────────────────────────────
	const [headerFooter, setHeaderFooter] = useState<HeaderFooterSectionValue>(
		createDefaultHeaderFooterSection(),
	);
	const [typography, setTypography] = useState<TypographySectionValue>(
		createDefaultTypographySection(),
	);
	const [voice, setVoice] = useState<VoiceSectionValue>(
		createDefaultVoiceSection(),
	);

	const { mutateAsync: createTemplate } = useConvexMutationQuery(
		api.functions.documentTemplates.create,
	);

	function canAdvance(): boolean {
		if (step === 1) {
			if (!nameFr.trim()) return false;
			if (
				applicability === "specificOrgTypes" &&
				applicableOrgTypes.length === 0
			)
				return false;
		}
		return true;
	}

	function next() {
		if (!canAdvance()) {
			if (step === 1 && !nameFr.trim()) {
				toast.error(t("templates.global.new.errors.nameRequired"));
			} else if (
				step === 1 &&
				applicability === "specificOrgTypes" &&
				applicableOrgTypes.length === 0
			) {
				toast.error(t("templates.global.new.errors.orgTypesRequired"));
			}
			return;
		}
		setStep((s) => (Math.min(s + 1, 5) as Step));
	}

	function previous() {
		setStep((s) => (Math.max(s - 1, 1) as Step));
	}

	async function onSubmit() {
		if (!nameFr.trim()) {
			toast.error(t("templates.global.new.errors.nameRequired"));
			setStep(1);
			return;
		}
		if (
			applicability === "specificOrgTypes" &&
			applicableOrgTypes.length === 0
		) {
			toast.error(t("templates.global.new.errors.orgTypesRequired"));
			setStep(1);
			return;
		}
		setIsPending(true);
		try {
			const id = await createTemplate({
				name: { fr: nameFr },
				description: descFr ? { fr: descFr } : undefined,
				category: category as never,
				templateType,
				content: {
					type: "doc",
					content: [{ type: "paragraph" }],
				},
				placeholders: [],
				isGlobal: true,
				autoPublishToCitizen,
				requireSignature,
				applicability,
				applicableOrgTypes:
					applicability === "specificOrgTypes"
						? (applicableOrgTypes as never)
						: undefined,
				// Legacy — conservé tant que d'anciens clients lisent ce champ.
				allowedOrgTypes:
					applicability === "specificOrgTypes"
						? (applicableOrgTypes as never)
						: undefined,
				// Les 3 facettes inline — cœur du modèle.
				headerFooter: serializeHeaderFooterSection(headerFooter) as never,
				typography: serializeTypographySection(typography) as never,
				voice: serializeVoiceSection(voice) as never,
				paperSize,
				orientation,
			});
			toast.success(t("templates.create.toast.created"));
			router.push(`/config/templates/${id}`);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: t("templates.create.errors.createFailed");
			toast.error(message);
		} finally {
			setIsPending(false);
		}
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title={t("templates.global.new.title")}
				subtitle={t("templates.global.new.subtitle")}
				icon={<FilePlus />}
				showBackButton
			/>

			<StepIndicator step={step} />

			<FlatCard className="p-6">
				{step === 1 ? (
					<Step1Identity
						nameFr={nameFr}
						descFr={descFr}
						templateType={templateType}
						category={category}
						paperSize={paperSize}
						orientation={orientation}
						autoPublishToCitizen={autoPublishToCitizen}
						requireSignature={requireSignature}
						applicability={applicability}
						applicableOrgTypes={applicableOrgTypes}
						onNameChange={setNameFr}
						onDescChange={setDescFr}
						onTemplateTypeChange={setTemplateType}
						onCategoryChange={setCategory}
						onPaperSizeChange={setPaperSize}
						onOrientationChange={setOrientation}
						onAutoPublishChange={setAutoPublish}
						onRequireSignatureChange={setRequireSignature}
						onApplicabilityChange={(next) => {
							setApplicability(next.applicability);
							setApplicableOrgTypes(next.applicableOrgTypes);
						}}
					/>
				) : step === 2 ? (
					<HeaderFooterSectionEditor
						value={headerFooter}
						onChange={setHeaderFooter}
					/>
				) : step === 3 ? (
					<TypographySectionEditor value={typography} onChange={setTypography} />
				) : step === 4 ? (
					<VoiceSectionEditor value={voice} onChange={setVoice} />
				) : (
					<Step5Review
						nameFr={nameFr}
						templateType={templateType}
						applicability={applicability}
						applicableOrgTypes={applicableOrgTypes}
						typography={typography}
						voice={voice}
					/>
				)}
			</FlatCard>

			<div className="flex items-center justify-between">
				<Button variant="ghost" onClick={() => router.back()}>
					{t("templates.common.cancel")}
				</Button>
				<div className="flex items-center gap-2">
					{step > 1 ? (
						<Button variant="outline" onClick={previous}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Précédent
						</Button>
					) : null}

					{step < 5 ? (
						<Button onClick={next} disabled={!canAdvance()}>
							Suivant
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					) : (
						<Button onClick={onSubmit} disabled={isPending}>
							<Check className="mr-2 h-4 w-4" />
							{isPending
								? t("templates.global.new.submitting")
								: "Créer et éditer le contenu"}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// Indicateur d'étape
// ============================================================================

function StepIndicator({ step }: { step: Step }) {
	const items = [
		{ n: 1, label: "Identité & diffusion", icon: <LayoutTemplate className="h-4 w-4" /> },
		{ n: 2, label: "Entête, logo, pied", icon: <Palette className="h-4 w-4" /> },
		{ n: 3, label: "Structure des textes", icon: <Type className="h-4 w-4" /> },
		{ n: 4, label: "Logique argumentaire", icon: <MessageSquareQuote className="h-4 w-4" /> },
		{ n: 5, label: "Récapitulatif", icon: <Check className="h-4 w-4" /> },
	] as const;
	return (
		<ol className="flex flex-wrap items-center gap-2">
			{items.map((item, idx) => {
				const active = step === item.n;
				const done = step > item.n;
				return (
					<li key={item.n} className="flex items-center gap-2">
						<div
							className={
								"flex h-8 w-8 items-center justify-center rounded-full border " +
								(done
									? "border-emerald-600 bg-emerald-600 text-white"
									: active
										? "border-primary bg-primary text-primary-foreground"
										: "border-muted bg-background text-muted-foreground")
							}
						>
							{done ? <Check className="h-4 w-4" /> : item.icon}
						</div>
						<span
							className={
								"text-sm " +
								(active ? "font-medium" : "text-muted-foreground")
							}
						>
							{item.label}
						</span>
						{idx < items.length - 1 ? (
							<span className="mx-2 h-px w-8 bg-border" />
						) : null}
					</li>
				);
			})}
		</ol>
	);
}

// ============================================================================
// Étape 1 — Identité & diffusion
// ============================================================================

interface Step1Props {
	nameFr: string;
	descFr: string;
	templateType: TemplateType;
	category: string;
	paperSize: "A4" | "LETTER";
	orientation: "portrait" | "landscape";
	autoPublishToCitizen: boolean;
	requireSignature: boolean;
	applicability: Applicability;
	applicableOrgTypes: string[];
	onNameChange: (v: string) => void;
	onDescChange: (v: string) => void;
	onTemplateTypeChange: (v: TemplateType) => void;
	onCategoryChange: (v: string) => void;
	onPaperSizeChange: (v: "A4" | "LETTER") => void;
	onOrientationChange: (v: "portrait" | "landscape") => void;
	onAutoPublishChange: (v: boolean) => void;
	onRequireSignatureChange: (v: boolean) => void;
	onApplicabilityChange: (next: {
		applicability: Applicability;
		applicableOrgTypes: string[];
	}) => void;
}

function Step1Identity(props: Step1Props) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-5">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-1">
					<Label htmlFor="nameFr">{t("templates.global.new.fields.nameFr")}</Label>
					<Input
						id="nameFr"
						value={props.nameFr}
						onChange={(e) => props.onNameChange(e.target.value)}
						placeholder={t("templates.global.new.fields.namePlaceholder")}
						required
					/>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="templateType">{t("templates.global.new.fields.type")}</Label>
					<Select
						value={props.templateType}
						onValueChange={(v) => props.onTemplateTypeChange(v as TemplateType)}
					>
						<SelectTrigger id="templateType">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{TEMPLATE_TYPES.map((tp) => (
								<SelectItem key={tp} value={tp}>
									{t(`templates.type.${tp}`)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex flex-col gap-1">
				<Label htmlFor="descFr">{t("templates.global.new.fields.descriptionFr")}</Label>
				<Textarea
					id="descFr"
					value={props.descFr}
					onChange={(e) => props.onDescChange(e.target.value)}
					placeholder={t("templates.global.new.fields.descriptionPlaceholder")}
					rows={2}
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="flex flex-col gap-1">
					<Label htmlFor="category">{t("templates.global.new.fields.category")}</Label>
					<Select value={props.category} onValueChange={props.onCategoryChange}>
						<SelectTrigger id="category">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(ServiceCategory).map(([k, v]) => (
								<SelectItem key={k} value={v}>
									{k}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="paperSize">{t("templates.global.new.fields.paperSize")}</Label>
					<Select
						value={props.paperSize}
						onValueChange={(v) => props.onPaperSizeChange(v as "A4" | "LETTER")}
					>
						<SelectTrigger id="paperSize">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="A4">
								{t("templates.global.new.fields.paperSizeA4")}
							</SelectItem>
							<SelectItem value="LETTER">
								{t("templates.global.new.fields.paperSizeLetter")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor="orientation">{t("templates.global.new.fields.orientation")}</Label>
					<Select
						value={props.orientation}
						onValueChange={(v) =>
							props.onOrientationChange(v as "portrait" | "landscape")
						}
					>
						<SelectTrigger id="orientation">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="portrait">
								{t("templates.global.new.fields.orientationPortrait")}
							</SelectItem>
							<SelectItem value="landscape">
								{t("templates.global.new.fields.orientationLandscape")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex flex-col gap-3 rounded-md border p-4">
				<div className="flex items-center justify-between gap-4">
					<div>
						<div className="font-medium">
							{t("templates.global.new.autoPublish.title")}
						</div>
						<div className="text-sm text-muted-foreground">
							{t("templates.global.new.autoPublish.description")}
						</div>
					</div>
					<Switch
						checked={props.autoPublishToCitizen}
						onCheckedChange={props.onAutoPublishChange}
					/>
				</div>
				<div className="flex items-center justify-between gap-4">
					<div>
						<div className="font-medium">
							{t("templates.global.new.requireSignature.title")}
						</div>
						<div className="text-sm text-muted-foreground">
							{t("templates.global.new.requireSignature.description")}
						</div>
					</div>
					<Switch
						checked={props.requireSignature}
						onCheckedChange={props.onRequireSignatureChange}
					/>
				</div>
			</div>

			<ApplicabilityPicker
				applicability={props.applicability}
				applicableOrgTypes={props.applicableOrgTypes}
				onChange={props.onApplicabilityChange}
			/>
		</div>
	);
}

// ============================================================================
// Étape 5 — Récapitulatif
// ============================================================================

function Step5Review(props: {
	nameFr: string;
	templateType: TemplateType;
	applicability: Applicability;
	applicableOrgTypes: string[];
	typography: TypographySectionValue;
	voice: VoiceSectionValue;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-5">
			<div>
				<h3 className="font-medium">Récapitulatif</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					Vérifie les choix avant de créer le modèle. Le contenu Tiptap sera
					rédigé à l'étape suivante.
				</p>
			</div>

			<ReviewRow label="Nom du modèle" value={props.nameFr} />
			<ReviewRow
				label="Type de document"
				value={t(`templates.type.${props.templateType}`)}
			/>
			<ReviewRow
				label="Diffusion"
				value={
					props.applicability === "all"
						? "Toutes les représentations"
						: `Types restreints : ${props.applicableOrgTypes.join(", ")}`
				}
			/>
			<ReviewRow
				label="Typographie"
				value={`${props.typography.fontFamily.split(",")[0]} · ${props.typography.fontSizeBase}pt · ${props.typography.defaultAlignment}`}
			/>
			<ReviewRow
				label="Ton rédactionnel"
				value={`${props.voice.tone} (${props.voice.register})`}
			/>
		</div>
	);
}

function ReviewRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-4 rounded-md border bg-background p-3">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-medium">{value}</span>
		</div>
	);
}
