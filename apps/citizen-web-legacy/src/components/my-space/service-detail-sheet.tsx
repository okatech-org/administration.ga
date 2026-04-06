/**
 * Service Detail Sheet — panneau lateral mobile-first.
 * Remplace les ServiceDetailModal dupliques dans 3 fichiers.
 * Utilise Sheet (glisse depuis la droite) pour une meilleure UX mobile.
 */

import { sanitizeHtml } from "@workspace/shared/utils/sanitize";
import {
	Calendar,
	CheckCircle2,
	Clock,
	FileText,
	Globe,
	MapPin,
	PlusCircle,
	ShieldAlert,
	Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCategoryConfig } from "@/lib/service-categories";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CatalogService = {
	_id: string;
	slug: string;
	name: string | Record<string, string>;
	description: string | Record<string, string>;
	content?: string | Record<string, string>;
	category: string;
	estimatedDays?: number;
	requiresAppointment?: boolean;
	eligibleProfiles?: string[];
	joinedDocuments?: Array<{
		type: string;
		label: { fr: string; en?: string };
		required: boolean;
	}>;
};

interface ServiceDetailSheetProps {
	service: CatalogService | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateRequest: () => void;
	isEligible?: boolean;
	isAvailableInJurisdiction?: boolean;
}

// ─── Composant ──────────────────────────────────────────────────────────────

export function ServiceDetailSheet({
	service,
	open,
	onOpenChange,
	onCreateRequest,
	isEligible = true,
	isAvailableInJurisdiction = true,
}: ServiceDetailSheetProps) {
	const { t, i18n } = useTranslation();

	if (!service) return null;

	const { icon: Icon, style } = getCategoryConfig(service.category);
	const serviceName = getLocalizedValue(service.name, i18n.language);
	const serviceDescription = getLocalizedValue(service.description, i18n.language);
	const serviceContent = service.content
		? getLocalizedValue(service.content, i18n.language)
		: null;
	const categoryLabel = t(`services.categoriesMap.${service.category}`);

	const PROFILE_COLORS: Record<string, string> = {
		long_stay: "bg-success/10 text-success",
		short_stay: "bg-primary/10 text-primary",
		visa_tourism: "bg-[oklch(0.55_0.20_290/0.12)] text-[oklch(0.55_0.20_290)]",
		visa_business: "bg-warning/10 text-warning",
		visa_long_stay: "bg-[oklch(0.52_0.17_145/0.12)] text-[oklch(0.52_0.17_145)]",
		admin_services: "bg-muted text-muted-foreground",
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-lg overflow-y-auto"
			>
				<SheetHeader className="pb-0">
					{/* Header avec icon et badges */}
					<div className="flex items-start gap-3">
						<div className={cn("p-2.5 rounded-xl shrink-0", style.bgColor, style.color)}>
							<Icon className="w-6 h-6" />
						</div>
						<div className="flex-1 min-w-0">
							<SheetTitle className="text-lg font-bold leading-tight">
								{serviceName}
							</SheetTitle>
							<div className="flex flex-wrap gap-1.5 mt-2">
								<Badge variant="secondary" className={cn("text-[10px]", style.bgColor, style.color)}>
									{categoryLabel}
								</Badge>
								{service.estimatedDays && (
									<Badge variant="outline" className="gap-1 text-[10px]">
										<Clock className="h-2.5 w-2.5" />
										{service.estimatedDays} {t("services.days", { count: service.estimatedDays })}
									</Badge>
								)}
								{service.requiresAppointment && (
									<Badge variant="outline" className="gap-1 text-[10px] bg-warning/10 text-warning border-warning/20">
										<Calendar className="h-2.5 w-2.5" />
										{t("services.appointmentRequired", "RDV requis")}
									</Badge>
								)}
							</div>
						</div>
					</div>

					<SheetDescription className="mt-3 text-sm leading-relaxed">
						{serviceDescription}
					</SheetDescription>
				</SheetHeader>

				{/* Contenu scrollable */}
				<div className="flex-1 space-y-4 px-4 pb-4">
					{/* Disponibilite en ligne */}
					{!isAvailableInJurisdiction ? (
						<div className="flex items-start gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
							<MapPin className="h-4 w-4 text-warning shrink-0 mt-0.5" />
							<div>
								<p className="text-sm font-medium text-warning">
									{t("services.notAvailableOnlineTitle", "Non disponible en ligne")}
								</p>
								<p className="text-xs text-warning/80 mt-0.5">
									{t("services.notAvailableOnlineDesc", "Ce service necessite une visite en personne.")}
								</p>
							</div>
						</div>
					) : (
						<div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20">
							<Globe className="h-4 w-4 text-success shrink-0" />
							<p className="text-sm font-medium text-success">
								{t("services.availableOnline", "Disponible en ligne")}
							</p>
						</div>
					)}

					{/* Contenu detaille */}
					{serviceContent && (
						<>
							<Separator />
							<div>
								<SectionLabel icon={FileText} label={t("services.detailsTitle", "Details")} />
								<div
									className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground mt-2"
									// biome-ignore lint/security/noDangerouslySetInnerHtml: contenu sanitise
									dangerouslySetInnerHTML={{ __html: sanitizeHtml(serviceContent) }}
								/>
							</div>
						</>
					)}

					{/* Documents requis */}
					{service.joinedDocuments && service.joinedDocuments.length > 0 && (
						<>
							<Separator />
							<div>
								<SectionLabel
									icon={FileText}
									label={`${t("services.requiredDocuments", "Documents requis")} (${service.joinedDocuments.length})`}
								/>
								<ul className="space-y-1.5 mt-2">
									{service.joinedDocuments.map((doc, index) => (
										<li
											key={`${doc.type}-${index}`}
											className="flex items-center gap-2.5 p-2 bg-foreground/[0.03] dark:bg-foreground/[0.06] rounded-lg"
										>
											<div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
												{index + 1}
											</div>
											<span className="flex-1 text-sm">
												{getLocalizedValue(doc.label, i18n.language)}
											</span>
											{doc.required && (
												<Badge variant="destructive" className="text-[10px] h-4 px-1.5 shrink-0">
													{t("services.required", "Requis")}
												</Badge>
											)}
										</li>
									))}
								</ul>
							</div>
						</>
					)}

					{/* Beneficiaires eligibles */}
					{service.eligibleProfiles && service.eligibleProfiles.length > 0 && (
						<>
							<Separator />
							<div>
								<SectionLabel
									icon={Users}
									label={t("services.modal.eligibleBeneficiaries", "Beneficiaires eligibles")}
								/>
								<div className="flex flex-wrap gap-1.5 mt-2">
									{service.eligibleProfiles.map((profileType: string) => (
										<Badge
											key={profileType}
											variant="secondary"
											className={cn("gap-1 text-[10px]", PROFILE_COLORS[profileType] ?? "bg-muted text-muted-foreground")}
										>
											<CheckCircle2 className="h-2.5 w-2.5" />
											{t(`services.modal.profileTypes.${profileType}`)}
										</Badge>
									))}
								</div>
							</div>
						</>
					)}

					{/* Informations importantes */}
					<div className="bg-foreground/[0.03] dark:bg-foreground/[0.06] rounded-xl p-3">
						<p className="text-xs font-semibold text-foreground mb-1.5">
							{t("services.modal.importantInfo", "Informations importantes")}
						</p>
						<ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground">
							<li>{t("services.modal.infoPoints.docs", "Preparez tous les documents requis avant de commencer")}</li>
							<li>{t("services.modal.infoPoints.delay", "Les delais de traitement sont indicatifs")}</li>
							<li>{t("services.modal.infoPoints.identity", "Une piece d'identite valide est toujours requise")}</li>
						</ul>
					</div>
				</div>

				{/* Footer fixe avec CTA */}
				<SheetFooter className="border-t bg-card">
					{!isAvailableInJurisdiction ? (
						<div className="flex items-center gap-2 p-3 rounded-xl bg-muted text-muted-foreground text-sm w-full">
							<ShieldAlert className="h-4 w-4 shrink-0" />
							<span>{t("services.notAvailableInJurisdiction", "Non disponible dans votre juridiction")}</span>
						</div>
					) : !isEligible ? (
						<div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 text-warning text-sm w-full">
							<ShieldAlert className="h-4 w-4 shrink-0" />
							<span>{t("services.notEligible", "Vous n'etes pas eligible a ce service")}</span>
						</div>
					) : (
						<Button onClick={onCreateRequest} className="gap-2 w-full rounded-xl">
							<PlusCircle className="h-4 w-4" />
							{t("services.modal.createRequest", "Effectuer cette demarche")}
						</Button>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

// ─── Sous-composant: Label de section iProfil ───────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
	return (
		<span className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
			<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
				<Icon className="h-3.5 w-3.5 text-muted-foreground" />
			</div>
			{label}
		</span>
	);
}
