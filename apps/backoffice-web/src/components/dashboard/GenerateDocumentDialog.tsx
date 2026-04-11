import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Check, Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { downloadPDF, type GenerationData } from "@/lib/pdfGenerator";

interface GenerateDocumentDialogProps {
	request: Doc<"requests"> & {
		user?: Doc<"users">;
		org?: Doc<"orgs">;
		orgService?: Doc<"orgServices"> & {
			service?: Doc<"services">;
		};
		service?: Doc<"services">;
	};
	profile?: Doc<"profiles">;
}

export function GenerateDocumentDialog({
	request,
	profile,
}: GenerateDocumentDialogProps) {
	const { t, i18n } = useTranslation();
	const lang = (i18n.language?.split("-")[0] || "fr") as "fr" | "en";

	const [open, setOpen] = useState(false);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [generated, setGenerated] = useState(false);

	// Fetch available templates
	const { data: templates } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listForService,
		request.orgService?.service?._id
			? { serviceId: request.orgService.service._id, orgId: request.orgId }
			: "skip",
	);

	// Also fetch all org templates if no service-specific ones
	const { data: orgTemplates } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listByOrg,
		{
			orgId: request.orgId,
		},
	);

	// Combine templates
	const allTemplates = templates ?? orgTemplates ?? [];
	const selectedTemplate = allTemplates.find(
		(t) => t._id === selectedTemplateId,
	);

	// Build generation data from request and profile
	const buildGenerationData = (): GenerationData => {
		const formData = request.formData as Record<string, unknown> | undefined;

		return {
			user: request.user
				? {
						firstName:
							(request.user as any).firstName ||
							(formData?.firstName as string),
						lastName:
							(request.user as any).lastName || (formData?.lastName as string),
						email: (request.user as any).email,
					}
				: undefined,
			profile: profile
				? {
						identity: {
							firstName: (profile.identity as any)?.firstName,
							lastName: (profile.identity as any)?.lastName,
							dateOfBirth: (profile.identity as any)?.dateOfBirth,
							placeOfBirth: (profile.identity as any)?.placeOfBirth,
							gender: (profile.identity as any)?.gender,
						},
						contact: {
							email: (profile.contacts as any)?.email,
							phone: (profile.contacts as any)?.phone,
							address: (profile.addresses as any)?.residence?.street,
							city: (profile.addresses as any)?.residence?.city,
							country: (profile.addresses as any)?.residence?.country,
						},
					}
				: undefined,
			request: {
				reference:
					request.reference || `REQ-${request._id.slice(-8).toUpperCase()}`,
				createdAt: request._creationTime,
				status: request.status,
				estimatedDays: request.orgService?.estimatedDays || 14,
			},
			formData: formData || {},
			org: request.org
				? {
						name: (request.org as any).name,
						address: (request.org as any).address,
						phone: (request.org as any).phone,
						email: (request.org as any).email,
					}
				: undefined,
			service:
				request.service || request.orgService?.service
					? {
							name: (request.service || request.orgService?.service)
								?.name as any,
						}
					: undefined,
		};
	};

	const handleGenerate = async () => {
		if (!selectedTemplate) {
			toast.error(
				t("documents.selectTemplate"),
			);
			return;
		}

		setIsGenerating(true);

		try {
			const data = buildGenerationData();
			const serviceName =
				(request.service?.name as any)?.[lang] ||
				(request.orgService?.service?.name as any)?.[lang] ||
				"Document";
			const fileName = `${serviceName}_${request.reference || request._id.slice(-8)}.pdf`;

			await downloadPDF(selectedTemplate, data, fileName, lang);

			setGenerated(true);
			toast.success(t("documents.generated"));

			// Reset after 2 seconds
			setTimeout(() => {
				setGenerated(false);
			}, 2000);
		} catch (error) {
			console.error("PDF generation error:", error);
			toast.error(t("documents.generateError"));
		} finally {
			setIsGenerating(false);
		}
	};

	const getTemplateTypeLabel = (type: string) => {
		const labels: Record<string, string> = {
			certificate: t("templates.type.certificate"),
			attestation: t("templates.type.attestation"),
			receipt: t("templates.type.receipt"),
			letter: t("templates.type.letter"),
			custom: t("templates.type.custom"),
		};
		return labels[type] || type;
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<FileText className="h-4 w-4 mr-2" />
					{t("documents.generate")}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						{t("documents.generateTitle")}
					</DialogTitle>
					<DialogDescription>
						{t(
							"documents.generateDescription",
							"Sélectionnez un modèle pour générer un document PDF.",
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Template selector */}
					<div className="space-y-2">
						<label className="text-sm font-medium">
							{t("documents.templateLabel")}
						</label>
						<Select
							value={selectedTemplateId}
							onValueChange={setSelectedTemplateId}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={t(
										"documents.selectTemplatePlaceholder",
										"Choisir un modèle...",
									)}
								/>
							</SelectTrigger>
							<SelectContent>
								{allTemplates.length === 0 ? (
									<div className="p-2 text-sm text-muted-foreground text-center">
										{t("documents.noTemplates")}
									</div>
								) : (
									allTemplates.map((template) => (
										<SelectItem key={template._id} value={template._id}>
											<div className="flex items-center gap-2">
												<span>
													{(template.name as any)?.[lang] ||
														(template.name as any)?.fr}
												</span>
												<Badge variant="secondary" className="text-xs">
													{getTemplateTypeLabel(template.templateType)}
												</Badge>
											</div>
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</div>

					{/* Selected template preview */}
					{selectedTemplate && (
						<FlatCard>
							<div className="p-3 lg:p-4">
								<h4 className="font-medium mb-1">
									{(selectedTemplate.name as any)?.[lang] ||
										(selectedTemplate.name as any)?.fr}
								</h4>
								{selectedTemplate.description && (
									<p className="text-sm text-muted-foreground">
										{(selectedTemplate.description as any)?.[lang] ||
											(selectedTemplate.description as any)?.fr}
									</p>
								)}
								<div className="flex items-center gap-2 mt-2">
									<Badge variant="outline">
										{getTemplateTypeLabel(selectedTemplate.templateType)}
									</Badge>
									<Badge variant="outline">
										{selectedTemplate.paperSize || "A4"}
									</Badge>
								</div>
							</div>
						</FlatCard>
					)}

					{/* Generate button */}
					<div className="flex justify-end gap-2 pt-2">
						<Button variant="ghost" onClick={() => setOpen(false)}>
							{t("common.cancel")}
						</Button>
						<Button
							onClick={handleGenerate}
							disabled={!selectedTemplateId || isGenerating}
						>
							{isGenerating ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									{t("documents.generating")}
								</>
							) : generated ? (
								<>
									<Check className="h-4 w-4 mr-2" />
									{t("documents.downloaded")}
								</>
							) : (
								<>
									<Download className="h-4 w-4 mr-2" />
									{t("documents.downloadPdf")}
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
