/**
 * Service Detail Sheet — Panneau lateral pour detail d'un service
 * Remplace le Dialog modal pour une meilleure UX
 */

import { sanitizeHtml } from "@workspace/shared/utils/sanitize";
import {
	Calendar,
	CheckCircle2,
	Clock,
	Download,
	FileText,
	Globe,
	type LucideIcon,
	MapPin,
	ShieldAlert,
	Users,
	X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
} from "@/components/ui/sheet";
import { CATEGORY_LIST, CATEGORY_STYLE } from "./category-nav";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceData {
	_id: string;
	slug: string;
	name: string;
	description: string;
	content?: string;
	category: string;
	estimatedDays?: number;
	requiresAppointment?: boolean;
	eligibleProfiles?: string[];
	joinedDocuments?: Array<{
		type: string;
		label: { fr: string; en?: string };
		required: boolean;
	}>;
	formFiles?: Array<{
		label: string;
		url?: string;
	}>;
}

interface ServiceDetailSheetProps {
	service: ServiceData | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateRequest: () => void;
	isEligible: boolean;
	isAvailableInJurisdiction: boolean;
}

// ─── Profile labels ───────────────────────────────────────────────────────────

const PROFILE_LABELS: Record<string, string> = {
	long_stay: "Sejour long",
	short_stay: "Sejour court",
	visa_tourism: "Visa tourisme",
	visa_business: "Visa affaires",
	visa_long_stay: "Visa long sejour",
	admin_services: "Services admin",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceDetailSheet({
	service,
	open,
	onOpenChange,
	onCreateRequest,
	isEligible,
	isAvailableInJurisdiction,
}: ServiceDetailSheetProps) {
	if (!service) return null;

	const catConfig = CATEGORY_LIST.find((c) => c.id === service.category);
	const style = CATEGORY_STYLE[service.category] ?? CATEGORY_STYLE.other;
	const Icon: LucideIcon = catConfig?.icon ?? Globe;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
				{/* Header */}
				<div className="sticky top-0 z-10 bg-card border-b border-border p-4">
					<div className="flex items-start gap-3">
						<div className={cn("p-2.5 rounded-xl shrink-0", style.bgColor)}>
							<Icon className={cn("w-5 h-5", style.color)} />
						</div>
						<div className="flex-1 min-w-0">
							<h2 className="text-base font-bold line-clamp-2">
								{service.name}
							</h2>
							<div className="flex items-center gap-2 mt-1 flex-wrap">
								<Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">
									{catConfig?.label ?? service.category}
								</Badge>
								{service.estimatedDays !== undefined && (
									<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
										<Clock className="w-3 h-3" />
										~{service.estimatedDays} jour{service.estimatedDays > 1 ? "s" : ""}
									</span>
								)}
								{service.requiresAppointment && (
									<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
										<Calendar className="w-3 h-3" />
										RDV requis
									</span>
								)}
							</div>
						</div>
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
						>
							<X className="w-4 h-4 text-muted-foreground" />
						</button>
					</div>

					{/* Availability + eligibility banners */}
					{(!isEligible || !isAvailableInJurisdiction) && (
						<div className="mt-3 space-y-2">
							{!isEligible && (
								<div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/15">
									<ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
									<p className="text-[11px] text-rose-700 dark:text-rose-400">
										Ce service n'est pas disponible pour votre profil
									</p>
								</div>
							)}
							{!isAvailableInJurisdiction && isEligible && (
								<div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/15">
									<MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
									<p className="text-[11px] text-amber-700 dark:text-amber-400">
										Non disponible en ligne pour votre pays de residence
									</p>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Body */}
				<div className="p-4 space-y-5">
					{/* Description */}
					{service.description && (
						<div>
							<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">
								Description
							</h3>
							<p className="text-sm text-foreground/80 leading-relaxed">
								{service.description}
							</p>
						</div>
					)}

					{/* HTML content */}
					{service.content && (
						<div>
							<Separator className="mb-4" />
							<div
								className="prose prose-sm dark:prose-invert max-w-none text-sm"
								dangerouslySetInnerHTML={{
									__html: sanitizeHtml(service.content),
								}}
							/>
						</div>
					)}

					{/* Eligible profiles */}
					{service.eligibleProfiles && service.eligibleProfiles.length > 0 && (
						<div>
							<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 mb-2 flex items-center gap-1.5">
								<Users className="w-3.5 h-3.5" />
								Beneficiaires eligibles
							</h3>
							<div className="flex flex-wrap gap-1.5">
								{service.eligibleProfiles.map((profile) => (
									<Badge
										key={profile}
										variant="outline"
										className="text-xs"
									>
										{PROFILE_LABELS[profile] ?? profile}
									</Badge>
								))}
							</div>
						</div>
					)}

					{/* Required documents */}
					{service.joinedDocuments && service.joinedDocuments.length > 0 && (
						<div>
							<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 mb-2 flex items-center gap-1.5">
								<FileText className="w-3.5 h-3.5" />
								Documents requis
							</h3>
							<div className="space-y-1.5">
								{service.joinedDocuments.map((doc, i) => (
									<div
										key={i}
										className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
									>
										<span className="flex items-center justify-center w-5 h-5 rounded-full bg-foreground/[0.06] text-[10px] font-bold text-muted-foreground shrink-0">
											{i + 1}
										</span>
										<span className="text-xs flex-1">
											{doc.label.fr}
										</span>
										{doc.required && (
											<Badge
												variant="outline"
												className="text-[9px] h-4 px-1 py-0 text-rose-600 dark:text-rose-400 border-rose-500/20"
											>
												Requis
											</Badge>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{/* Downloadable forms */}
					{service.formFiles && service.formFiles.length > 0 && (
						<div>
							<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 mb-2 flex items-center gap-1.5">
								<Download className="w-3.5 h-3.5" />
								Formulaires a telecharger
							</h3>
							<div className="space-y-1.5">
								{service.formFiles.map((file, i) => (
									<a
										key={i}
										href={file.url}
										target="_blank"
										rel="noreferrer"
										className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
									>
										<FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
										<span className="text-xs group-hover:text-primary transition-colors flex-1">
											{file.label}
										</span>
										<Download className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
									</a>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Footer CTA */}
				<div className="sticky bottom-0 bg-card border-t border-border p-4">
					<Button
						size="lg"
						className="w-full gap-2 rounded-xl"
						disabled={!isEligible || !isAvailableInJurisdiction}
						onClick={onCreateRequest}
					>
						{isEligible && isAvailableInJurisdiction ? (
							<>
								<CheckCircle2 className="w-4 h-4" />
								Faire cette demarche
							</>
						) : (
							"Non disponible"
						)}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
