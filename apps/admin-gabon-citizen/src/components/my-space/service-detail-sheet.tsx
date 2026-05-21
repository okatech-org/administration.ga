/**
 * Service Detail Sheet — bottom sheet mobile-first.
 * Uses the reusable BottomSheet component.
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
	X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCategoryConfig } from "@/lib/service-categories";
import { getLocalizedValue } from "@/lib/i18n-utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BottomSheet } from "@/components/ui/bottom-sheet";

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

	const footerContent = !isAvailableInJurisdiction ? (
		<div className="flex w-full items-center gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
			<ShieldAlert className="h-4 w-4 shrink-0" />
			<span>{t("services.notAvailableInJurisdiction")}</span>
		</div>
	) : !isEligible ? (
		<div className="flex w-full items-center gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning">
			<ShieldAlert className="h-4 w-4 shrink-0" />
			<span>{t("services.notEligible")}</span>
		</div>
	) : (
		<Button onClick={onCreateRequest} className="w-full gap-2 rounded-xl">
			<PlusCircle className="h-4 w-4" />
			{t("services.modal.createRequest")}
		</Button>
	);

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			footer={footerContent}
			showCloseButton={false}
		>
			{/* Header with icon + badges + close */}
			<div className="border-b border-border/30 px-4 pb-3 sm:px-5">
				<div className="flex w-full items-start gap-3">
					<div className={cn("shrink-0 rounded-xl p-2.5", style.bgColor, style.color)}>
						<Icon className="h-5 w-5" />
					</div>
					<div className="min-w-0 flex-1">
						<h3 className="text-base font-bold leading-tight sm:text-lg">
							{serviceName}
						</h3>
						<div className="mt-1.5 flex flex-wrap gap-1.5">
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
								<Badge variant="outline" className="gap-1 border-warning/20 bg-warning/10 text-[10px] text-warning">
									<Calendar className="h-2.5 w-2.5" />
									{t("services.appointmentRequired")}
								</Badge>
							)}
						</div>
					</div>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
					{serviceDescription}
				</p>
			</div>

			{/* Scrollable content */}
			<div className="space-y-4 px-4 py-4 sm:px-5">
				{/* Disponibilite en ligne */}
				{!isAvailableInJurisdiction ? (
					<div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/10 p-3">
						<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
						<div>
							<p className="text-sm font-medium text-warning">
								{t("services.notAvailableOnlineTitle")}
							</p>
							<p className="mt-0.5 text-xs text-warning/80">
								{t("services.notAvailableOnlineDesc")}
							</p>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 p-3">
						<Globe className="h-4 w-4 shrink-0 text-success" />
						<p className="text-sm font-medium text-success">
							{t("services.availableOnline")}
						</p>
					</div>
				)}

				{/* Contenu detaille */}
				{serviceContent && (
					<>
						<Separator />
						<div>
							<SectionLabel icon={FileText} label={t("services.detailsTitle")} />
							<div
								className="prose prose-sm dark:prose-invert mt-2 max-w-none text-muted-foreground"
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
								label={`${t("services.requiredDocuments")} (${service.joinedDocuments.length})`}
							/>
							<ul className="mt-2 space-y-1.5">
								{service.joinedDocuments.map((doc, index) => (
									<li
										key={`${doc.type}-${index}`}
										className="flex items-center gap-2.5 rounded-lg bg-foreground/[0.03] p-2 dark:bg-foreground/[0.06]"
									>
										<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
											{index + 1}
										</div>
										<span className="flex-1 text-sm">
											{getLocalizedValue(doc.label, i18n.language)}
										</span>
										{doc.required && (
											<Badge variant="destructive" className="h-4 shrink-0 px-1.5 text-[10px]">
												{t("services.required")}
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
								label={t("services.modal.eligibleBeneficiaries")}
							/>
							<div className="mt-2 flex flex-wrap gap-1.5">
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
				<div className="rounded-xl bg-foreground/[0.03] p-3 dark:bg-foreground/[0.06]">
					<p className="mb-1.5 text-xs font-semibold text-foreground">
						{t("services.modal.importantInfo")}
					</p>
					<ul className="list-inside list-disc space-y-0.5 text-[11px] text-muted-foreground">
						<li>{t("services.modal.infoPoints.docs")}</li>
						<li>{t("services.modal.infoPoints.delay")}</li>
						<li>{t("services.modal.infoPoints.identity")}</li>
					</ul>
				</div>
			</div>
		</BottomSheet>
	);
}

// ─── Sous-composant: Label de section ───────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
	return (
		<span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
			<div className="rounded-md bg-foreground/[0.06] p-1 dark:bg-foreground/[0.12]">
				<Icon className="h-3.5 w-3.5 text-muted-foreground" />
			</div>
			{label}
		</span>
	);
}
