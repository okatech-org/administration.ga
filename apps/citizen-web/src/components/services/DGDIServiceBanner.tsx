import { ChevronDown, ExternalLink, Globe, Info, Monitor } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/**
 * Banniere DGDI Passeports & Visas.
 * Affiche les informations sur le service en ligne DGDI.
 * Collapsible sur mobile, toujours visible sur desktop.
 */
export function DGDIServiceBanner() {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="rounded-[10px] border border-border bg-card overflow-hidden">
			<div className="relative p-5">
				{/* Header — toujours visible */}
				<div className="flex items-start gap-2.5 mb-4">
					<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0 mt-1">
						<Info className="w-4 h-4 text-primary" />
					</div>
					<div>
						<h3 className="text-sm font-bold text-foreground leading-tight">
							{t("dgdi.passportService", "Service Passeport")}{" "}
							<span className="text-primary">(DGDI)</span>
						</h3>
						<h3 className="text-sm font-bold text-foreground leading-tight mt-0.5">
							{t("dgdi.visaService", "Service Visa")}{" "}
							<span className="text-primary">(DGDI)</span>
						</h3>
						<p className="text-xs text-muted-foreground font-medium mt-1.5 leading-snug">
							{t(
								"dgdi.subtitle",
								"Service en ligne sous l'autorite de la DGDI",
							)}
						</p>
					</div>
				</div>

				{/* Toggle mobile */}
				<button
					onClick={() => setExpanded(!expanded)}
					className="lg:hidden w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary py-1.5 mb-3 rounded-lg hover:bg-primary/5 transition-colors"
				>
					{expanded
						? t("dgdi.hideDetails", "Masquer les details")
						: t("dgdi.showDetails", "Voir les details")}
					<ChevronDown
						className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
					/>
				</button>

				{/* Details — collapsible mobile, toujours visible desktop */}
				<div className={`${expanded ? "block" : "hidden"} lg:block`}>
					{/* Demarches en ligne */}
					<div className="mb-5">
						<h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
							<span className="w-0.5 h-3.5 rounded-full inline-block bg-primary" />
							{t("dgdi.onlineServices", "Demarches en ligne")}
						</h4>

						<div className="space-y-2.5">
							<div className="flex items-start gap-2.5">
								<div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
									<Monitor className="w-3 h-3 text-primary" />
								</div>
								<p className="text-foreground text-xs font-medium leading-relaxed">
									{t(
										"dgdi.onlinePlatformDesc",
										"Toutes les demarches de passeport et visa se font en ligne sur la plateforme DGDI.",
									)}
								</p>
							</div>

							<div className="flex items-center gap-2.5">
								<div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
									<Globe className="w-3 h-3 text-primary" />
								</div>
								<a
									href="https://www.dgdi.ga/"
									target="_blank"
									rel="noopener noreferrer"
									className="text-primary text-xs font-medium underline underline-offset-2 decoration-primary/30 hover:decoration-primary/80 transition-all truncate"
								>
									www.dgdi.ga
								</a>
							</div>
						</div>
					</div>

					<div className="border-t border-border mb-5" />

					{/* Informations importantes */}
					<div className="mb-5">
						<h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
							<span className="w-0.5 h-3.5 rounded-full inline-block bg-primary" />
							{t("dgdi.importantInfo", "Informations importantes")}
						</h4>

						<div className="space-y-2.5">
							<div className="flex items-center gap-3 rounded-[10px] border border-border bg-muted/50 px-3 py-2.5">
								<span className="text-sm shrink-0">💻</span>
								<p className="text-foreground text-xs font-medium leading-relaxed">
									{t(
										"dgdi.noPhysicalOffice",
										"Demarches 100% en ligne sur la plateforme DGDI",
									)}
								</p>
							</div>

							<div className="flex items-center gap-3 rounded-[10px] border border-border bg-muted/50 px-3 py-2.5">
								<span className="text-sm shrink-0">📄</span>
								<p className="text-foreground text-xs font-medium leading-relaxed">
									{t(
										"dgdi.docsRequired",
										"Documents requis : passeport actuel, acte de naissance, photos d'identite",
									)}
								</p>
							</div>

							<div className="flex items-center gap-3 rounded-[10px] border border-border bg-muted/50 px-3 py-2.5">
								<span className="text-sm shrink-0">⏱️</span>
								<p className="text-foreground text-xs font-medium leading-relaxed">
									{t(
										"dgdi.processingTime",
										"Delai de traitement variable selon le type de demande",
									)}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* CTA — toujours visible */}
				<Button
					size="sm"
					className="w-full h-10 rounded-full text-xs font-bold gap-1.5 transition-all duration-300"
					asChild
				>
					<a
						href="https://www.dgdi.ga/"
						target="_blank"
						rel="noopener noreferrer"
					>
						{t("dgdi.bookAppointment", "Prendre Rendez-vous DGDI")}
						<ExternalLink className="w-3.5 h-3.5" />
					</a>
				</Button>
			</div>
		</div>
	);
}
