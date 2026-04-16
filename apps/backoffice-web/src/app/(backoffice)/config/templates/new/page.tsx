"use client";

/**
 * Create a new GLOBAL template (super-admin). Handles only metadata — content
 * is authored on the edit page after creation.
 */

import { api } from "@convex/_generated/api";
import { ServiceCategory } from "@convex/lib/constants";
import { FilePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { OrgTypeAccessPicker } from "@/components/config/OrgTypeAccessPicker";
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
	const [nameFr, setNameFr] = useState("");
	const [descFr, setDescFr] = useState("");
	const [templateType, setTemplateType] = useState<TemplateType>("attestation");
	const [category, setCategory] = useState<string>(ServiceCategory.Certification);
	const [paperSize, setPaperSize] = useState<"A4" | "LETTER">("A4");
	const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
	const [autoPublishToCitizen, setAutoPublish] = useState(true);
	const [requireSignature, setRequireSignature] = useState(false);
	const [allowedOrgTypes, setAllowedOrgTypes] = useState<string[] | undefined>(
		undefined,
	);
	const [isPending, setIsPending] = useState(false);

	const { mutateAsync: createTemplate } = useConvexMutationQuery(
		api.functions.documentTemplates.create,
	);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!nameFr.trim()) {
			toast.error(t("templates.global.new.errors.nameRequired"));
			return;
		}
		if (allowedOrgTypes && allowedOrgTypes.length === 0) {
			toast.error(t("templates.global.new.errors.orgTypesRequired"));
			return;
		}
		setIsPending(true);
		try {
			const id = await createTemplate({
				name: descFr ? { fr: nameFr } : { fr: nameFr },
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
				allowedOrgTypes: allowedOrgTypes as never,
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

			<FlatCard className="p-6">
				<form onSubmit={onSubmit} className="flex flex-col gap-5">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-1">
							<Label htmlFor="nameFr">{t("templates.global.new.fields.nameFr")}</Label>
							<Input
								id="nameFr"
								value={nameFr}
								onChange={(e) => setNameFr(e.target.value)}
								placeholder={t("templates.global.new.fields.namePlaceholder")}
								required
							/>
						</div>
						<div className="flex flex-col gap-1">
							<Label htmlFor="templateType">{t("templates.global.new.fields.type")}</Label>
							<Select
								value={templateType}
								onValueChange={(v) => setTemplateType(v as TemplateType)}
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
							value={descFr}
							onChange={(e) => setDescFr(e.target.value)}
							placeholder={t("templates.global.new.fields.descriptionPlaceholder")}
							rows={2}
						/>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<div className="flex flex-col gap-1">
							<Label htmlFor="category">{t("templates.global.new.fields.category")}</Label>
							<Select value={category} onValueChange={setCategory}>
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
							<Select value={paperSize} onValueChange={(v) => setPaperSize(v as "A4" | "LETTER")}>
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
								value={orientation}
								onValueChange={(v) => setOrientation(v as "portrait" | "landscape")}
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
							<Switch checked={autoPublishToCitizen} onCheckedChange={setAutoPublish} />
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
							<Switch checked={requireSignature} onCheckedChange={setRequireSignature} />
						</div>
					</div>

					<OrgTypeAccessPicker
						value={allowedOrgTypes}
						onChange={setAllowedOrgTypes}
					/>

					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => router.back()}>
							{t("templates.common.cancel")}
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending
								? t("templates.global.new.submitting")
								: t("templates.global.new.submit")}
						</Button>
					</div>
				</form>
			</FlatCard>
		</div>
	);
}
