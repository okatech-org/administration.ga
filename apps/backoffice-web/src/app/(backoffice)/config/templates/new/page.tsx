"use client";

/**
 * Wizard de création d'un modèle global en 3 étapes.
 *
 *   1. Identité & diffusion  : nom, type, catégorie, scope (all/orgTypes)
 *   2. Composition            : 3 briques optionnelles (entête, typo, voix IA)
 *   3. Contenu                : bascule vers l'éditeur Tiptap — le template
 *                              est créé avec un document vide, puis redirigé.
 *
 * La logique de persistance est identique à l'ancienne page `/new` — on a
 * juste découpé les champs en 3 étapes pour guider l'utilisateur.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
import { TemplateBlockPicker } from "@/components/config/TemplateBlockPicker";
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
import { useConvexMutationQuery, useConvexQuery } from "@/integrations/convex/hooks";

type TemplateType = "certificate" | "attestation" | "receipt" | "letter" | "custom";
type Step = 1 | 2 | 3;

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

	// ─── Étape 2 : composition ──────────────────────────────────────────
	const [headerFooterBlockId, setHeaderFooterBlockId] = useState<
		Id<"templateHeaderFooterBlocks"> | undefined
	>(undefined);
	const [typographyBlockId, setTypographyBlockId] = useState<
		Id<"templateTypographyBlocks"> | undefined
	>(undefined);
	const [voiceBlockId, setVoiceBlockId] = useState<
		Id<"templateVoiceBlocks"> | undefined
	>(undefined);

	const { data: headerFooterBlocks } = useConvexQuery(
		api.functions.templateHeaderFooterBlocks.listGlobal,
		{},
	);
	const { data: typographyBlocks } = useConvexQuery(
		api.functions.templateTypographyBlocks.listGlobal,
		{},
	);
	const { data: voiceBlocks } = useConvexQuery(
		api.functions.templateVoiceBlocks.listGlobal,
		{},
	);

	const [isPending, setIsPending] = useState(false);
	const { mutateAsync: createTemplate } = useConvexMutationQuery(
		api.functions.documentTemplates.create,
	);

	// ─── Validation par étape ───────────────────────────────────────────
	function canAdvance(): boolean {
		if (step === 1) {
			if (!nameFr.trim()) return false;
			if (
				applicability === "specificOrgTypes" &&
				applicableOrgTypes.length === 0
			)
				return false;
			return true;
		}
		return true; // Étape 2 & 3 : tout optionnel
	}

	function next() {
		if (!canAdvance()) {
			if (step === 1 && !nameFr.trim()) {
				toast.error(t("templates.global.new.errors.nameRequired"));
				return;
			}
			if (
				step === 1 &&
				applicability === "specificOrgTypes" &&
				applicableOrgTypes.length === 0
			) {
				toast.error(t("templates.global.new.errors.orgTypesRequired"));
				return;
			}
		}
		setStep((s) => (Math.min(s + 1, 3) as Step));
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
				// Legacy — toujours renseigné pour les consommateurs qui n'ont pas
				// encore migré vers `applicability`.
				allowedOrgTypes:
					applicability === "specificOrgTypes"
						? (applicableOrgTypes as never)
						: undefined,
				headerFooterBlockId,
				typographyBlockId,
				voiceBlockId,
				paperSize,
				orientation,
			});
			toast.success(t("templates.create.toast.created"));
			router.push(`/config/templates/${id}`);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t("templates.create.errors.createFailed");
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
					<Step2Composition
						headerFooterBlockId={headerFooterBlockId}
						typographyBlockId={typographyBlockId}
						voiceBlockId={voiceBlockId}
						headerFooterBlocks={headerFooterBlocks}
						typographyBlocks={typographyBlocks}
						voiceBlocks={voiceBlocks}
						onHeaderFooterChange={setHeaderFooterBlockId}
						onTypographyChange={setTypographyBlockId}
						onVoiceChange={setVoiceBlockId}
					/>
				) : (
					<Step3Review
						nameFr={nameFr}
						templateType={templateType}
						applicability={applicability}
						applicableOrgTypes={applicableOrgTypes}
						headerFooterBlockId={headerFooterBlockId}
						typographyBlockId={typographyBlockId}
						voiceBlockId={voiceBlockId}
						headerFooterBlocks={headerFooterBlocks}
						typographyBlocks={typographyBlocks}
						voiceBlocks={voiceBlocks}
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

					{step < 3 ? (
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
		{ n: 2, label: "Composition", icon: <Palette className="h-4 w-4" /> },
		{ n: 3, label: "Récapitulatif", icon: <Check className="h-4 w-4" /> },
	] as const;
	return (
		<ol className="flex items-center gap-2">
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
// Étape 1
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
// Étape 2
// ============================================================================

interface Step2Props {
	headerFooterBlockId: Id<"templateHeaderFooterBlocks"> | undefined;
	typographyBlockId: Id<"templateTypographyBlocks"> | undefined;
	voiceBlockId: Id<"templateVoiceBlocks"> | undefined;
	headerFooterBlocks: Array<{
		_id: Id<"templateHeaderFooterBlocks">;
		name: Record<string, string>;
		description?: Record<string, string>;
		isDefault?: boolean;
	}> | undefined;
	typographyBlocks: Array<{
		_id: Id<"templateTypographyBlocks">;
		name: Record<string, string>;
		description?: Record<string, string>;
		isDefault?: boolean;
	}> | undefined;
	voiceBlocks: Array<{
		_id: Id<"templateVoiceBlocks">;
		name: Record<string, string>;
		description?: Record<string, string>;
		isDefault?: boolean;
	}> | undefined;
	onHeaderFooterChange: (v: Id<"templateHeaderFooterBlocks"> | undefined) => void;
	onTypographyChange: (v: Id<"templateTypographyBlocks"> | undefined) => void;
	onVoiceChange: (v: Id<"templateVoiceBlocks"> | undefined) => void;
}

function Step2Composition(props: Step2Props) {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<div className="flex items-center gap-2">
					<Palette className="h-5 w-5 text-muted-foreground" />
					<h3 className="font-medium">Composition du modèle</h3>
				</div>
				<p className="mt-1 text-sm text-muted-foreground">
					Choisis les briques réutilisables qui habilleront ce modèle. Toutes
					les briques sont optionnelles — si aucune n'est sélectionnée, les
					réglages par défaut sont appliqués au rendu.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="flex flex-col gap-3 rounded-md border p-4">
					<div className="flex items-center gap-2">
						<Palette className="h-4 w-4 text-muted-foreground" />
						<h4 className="font-medium">Entête & pied</h4>
					</div>
					<TemplateBlockPicker
						label="Brique sélectionnée"
						helpText="Logo, titre institutionnel, pied de page."
						blocks={props.headerFooterBlocks}
						value={props.headerFooterBlockId}
						onChange={(v) =>
							props.onHeaderFooterChange(v as Id<"templateHeaderFooterBlocks">)
						}
						createHref="/config/templates/header-footer-blocks/new"
					/>
				</div>

				<div className="flex flex-col gap-3 rounded-md border p-4">
					<div className="flex items-center gap-2">
						<Type className="h-4 w-4 text-muted-foreground" />
						<h4 className="font-medium">Typographie</h4>
					</div>
					<TemplateBlockPicker
						label="Brique sélectionnée"
						helpText="Police, tailles, interlignage, alignement, sauts."
						blocks={props.typographyBlocks}
						value={props.typographyBlockId}
						onChange={(v) =>
							props.onTypographyChange(v as Id<"templateTypographyBlocks">)
						}
						createHref="/config/templates/typography-blocks/new"
					/>
				</div>

				<div className="flex flex-col gap-3 rounded-md border p-4">
					<div className="flex items-center gap-2">
						<MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
						<h4 className="font-medium">Style rédactionnel</h4>
					</div>
					<TemplateBlockPicker
						label="Brique sélectionnée"
						helpText="Ton, formules, argumentaire (métier IA uniquement)."
						blocks={props.voiceBlocks}
						value={props.voiceBlockId}
						onChange={(v) => props.onVoiceChange(v as Id<"templateVoiceBlocks">)}
						createHref="/config/templates/voice-blocks/new"
					/>
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// Étape 3 — Récapitulatif
// ============================================================================

function Step3Review(props: {
	nameFr: string;
	templateType: TemplateType;
	applicability: Applicability;
	applicableOrgTypes: string[];
	headerFooterBlockId: Id<"templateHeaderFooterBlocks"> | undefined;
	typographyBlockId: Id<"templateTypographyBlocks"> | undefined;
	voiceBlockId: Id<"templateVoiceBlocks"> | undefined;
	headerFooterBlocks: Step2Props["headerFooterBlocks"];
	typographyBlocks: Step2Props["typographyBlocks"];
	voiceBlocks: Step2Props["voiceBlocks"];
}) {
	const { t } = useTranslation();
	const hf = props.headerFooterBlocks?.find((b) => b._id === props.headerFooterBlockId);
	const tp = props.typographyBlocks?.find((b) => b._id === props.typographyBlockId);
	const vb = props.voiceBlocks?.find((b) => b._id === props.voiceBlockId);

	return (
		<div className="flex flex-col gap-5">
			<div>
				<h3 className="font-medium">Récapitulatif</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					Vérifie les choix avant de créer le modèle. Le contenu sera édité à
					l'étape suivante dans l'éditeur Tiptap.
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
				label="Entête & pied"
				value={hf ? (hf.name.fr ?? hf.name.en ?? "(sans nom)") : "Défaut"}
			/>
			<ReviewRow
				label="Typographie"
				value={tp ? (tp.name.fr ?? tp.name.en ?? "(sans nom)") : "Défaut"}
			/>
			<ReviewRow
				label="Style rédactionnel"
				value={vb ? (vb.name.fr ?? vb.name.en ?? "(sans nom)") : "Défaut"}
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
