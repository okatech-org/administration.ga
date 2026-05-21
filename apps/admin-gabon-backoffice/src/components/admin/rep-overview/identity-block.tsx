"use client";

import {
	Building2,
	Clock,
	Crown,
	Globe,
	Mail,
	MapPin,
	Package2,
	Phone,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Doc } from "@convex/_generated/dataModel";
import type { CountryCode } from "@convex/lib/constants";
import {
	MODULE_REGISTRY,
	type ModuleCategory,
	type ModuleCodeValue,
} from "@convex/lib/moduleCodes";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { Badge } from "@/components/ui/badge";
import { FlagIcon } from "@/components/ui/flag-icon";
import { DynamicLucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";

interface IdentityBlockProps {
	org: Doc<"orgs">;
	headOfMissionName?: string | null;
}

// Ordre d'affichage des catégories + libellés français
const CATEGORY_CONFIG: Record<
	ModuleCategory,
	{ label: string; order: number }
> = {
	operations: { label: "Opérations", order: 1 },
	ibureau: { label: "iBureau", order: 2 },
	noyau_administratif: { label: "Noyau administratif", order: 3 },
	gestion: { label: "Gestion", order: 4 },
	administration: { label: "Administration", order: 5 },
	network: { label: "Réseau diplomatique", order: 6 },
	intelligence: { label: "Renseignement", order: 7 },
};


/**
 * Bloc d'identité & juridiction — condense en une seule carte :
 * - Adresse + Contact (colonne gauche)
 * - Chef de mission + Juridiction + Modules + Métadonnées (colonne droite)
 */
export function IdentityBlock({ org, headOfMissionName }: IdentityBlockProps) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";

	const address = org.addresses?.physical ?? org.address;
	const jurisdictions = (org.jurisdictionCountries as string[] | undefined) ?? [];
	const modules = (org.modules as string[] | undefined) ?? [];

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<Building2 className="h-4 w-4" />}
					title={t(
						"superadmin.organizations.overview.identity.title",
						"Identité & juridiction",
					)}
				/>
				<div className="grid gap-4 md:grid-cols-2">
					{/* Colonne gauche — Adresse + Contact + Chef de mission */}
					<div className="space-y-4">
						{address && (
							<div>
								<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
									<MapPin className="h-3.5 w-3.5" />
									<span>
										{t(
											"superadmin.organizations.form.address",
											"Adresse",
										)}
									</span>
								</div>
								<div className="space-y-0.5 text-sm pl-5">
									{address.street && <p>{address.street}</p>}
									{(address.city || address.postalCode) && (
										<p>
											{[address.city, address.postalCode]
												.filter(Boolean)
												.join(", ")}
										</p>
									)}
									{address.country && (
										<p className="font-medium">
											{t(
												`superadmin.countryCodes.${address.country}`,
												address.country,
											)}
										</p>
									)}
								</div>
							</div>
						)}

						<div>
							<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
								<Mail className="h-3.5 w-3.5" />
								<span>
									{t(
										"superadmin.organizations.form.contact",
										"Contact",
									)}
								</span>
							</div>
							<div className="space-y-1.5 text-sm pl-5">
								{org.email && (
									<div className="flex items-center gap-2">
										<Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
										<a
											href={`mailto:${org.email}`}
											className="text-primary hover:underline truncate"
										>
											{org.email}
										</a>
									</div>
								)}
								{org.phone && (
									<div className="flex items-center gap-2">
										<Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
										<a
											href={`tel:${org.phone}`}
											className="text-primary hover:underline"
										>
											{org.phone}
										</a>
									</div>
								)}
								{org.website && (
									<div className="flex items-center gap-2">
										<Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
										<a
											href={org.website}
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:underline truncate"
										>
											{org.website}
										</a>
									</div>
								)}
								{!org.email && !org.phone && !org.website && (
									<p className="text-muted-foreground italic text-xs">
										{t("superadmin.common.noData", "Aucune donnée")}
									</p>
								)}
							</div>
						</div>

						{headOfMissionName && (
							<div>
								<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
									<Crown className="h-3.5 w-3.5" />
									<span>
										{t(
											"superadmin.organizations.overview.identity.headOfMission",
											"Chef de mission",
										)}
									</span>
								</div>
								<p className="text-sm pl-5 font-medium">
									{headOfMissionName}
								</p>
							</div>
						)}
					</div>

					{/* Colonne droite — Juridiction + Modules + Métadonnées */}
					<div className="space-y-4">
						{jurisdictions.length > 0 && (
							<div>
								<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
									<Globe className="h-3.5 w-3.5" />
									<span>
										{t(
											"superadmin.organizations.form.jurisdictionCountries",
											"Pays de juridiction",
										)}
									</span>
								</div>
								<div className="flex flex-wrap gap-1.5 pl-5">
									{jurisdictions.map((code) => (
										<div
											key={code}
											className="flex items-center gap-1.5 rounded-md bg-background/60 border border-border/60 px-2 py-1 text-xs"
										>
											<FlagIcon
												countryCode={code as CountryCode}
												size={14}
												className="w-3.5 !h-auto rounded-sm"
											/>
											{t(`superadmin.countryCodes.${code}`, code)}
										</div>
									))}
								</div>
							</div>
						)}

						{modules.length > 0 && (
							<div>
								<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
									<Package2 className="h-3.5 w-3.5" />
									<span>
										{t(
											"superadmin.organizations.form.modules",
											"Modules activés",
										)}
										<span className="text-muted-foreground/70 ml-1">
											({modules.length})
										</span>
									</span>
								</div>
								<ModulesByCategory modules={modules} lang={lang} />
							</div>
						)}

						<div>
							<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
								<Clock className="h-3.5 w-3.5" />
								<span>
									{t(
										"superadmin.organizations.overview.identity.metadata",
										"Métadonnées",
									)}
								</span>
							</div>
							<dl className="grid grid-cols-2 gap-2 pl-5 text-xs">
								<div>
									<dt className="text-muted-foreground">
										{t(
											"superadmin.organizations.form.timezone",
											"Fuseau",
										)}
									</dt>
									<dd className="font-medium truncate">
										{org.timezone || "—"}
									</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">
										{t("superadmin.table.createdAt", "Créé le")}
									</dt>
									<dd className="font-medium">
										{new Date(org._creationTime).toLocaleDateString(
											lang === "fr" ? "fr-FR" : "en-US",
										)}
									</dd>
								</div>
								<div className="col-span-2">
									<dt className="text-muted-foreground">Slug</dt>
									<dd className="font-mono text-[11px] text-foreground/80">
										{org.slug}
									</dd>
								</div>
							</dl>
						</div>
					</div>
				</div>
			</div>
		</FlatCard>
	);
}

/**
 * Groupe les modules par catégorie et les rend comme pills avec icône + label FR/EN.
 * Code technique affiché en tooltip au hover.
 */
function ModulesByCategory({
	modules,
	lang,
}: {
	modules: string[];
	lang: "fr" | "en";
}) {
	const grouped = new Map<string, { label: string; items: string[] }>();
	const unknown: string[] = [];

	for (const code of modules) {
		const def = MODULE_REGISTRY[code as ModuleCodeValue];
		if (!def) {
			unknown.push(code);
			continue;
		}
		const catKey = def.category;
		const catLabel =
			CATEGORY_CONFIG[catKey as ModuleCategory]?.label ?? catKey;
		if (!grouped.has(catKey)) {
			grouped.set(catKey, { label: catLabel, items: [] });
		}
		grouped.get(catKey)!.items.push(code);
	}

	const sortedCategories = Array.from(grouped.entries()).sort(([a], [b]) => {
		const orderA = CATEGORY_CONFIG[a as ModuleCategory]?.order ?? 99;
		const orderB = CATEGORY_CONFIG[b as ModuleCategory]?.order ?? 99;
		return orderA - orderB;
	});

	return (
		<div className="space-y-2.5 pl-5">
			{sortedCategories.map(([catKey, { label, items }]) => (
				<div key={catKey}>
					<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
						{label}
					</p>
					<div className="flex flex-wrap gap-1">
						{items.map((code) => {
							const def = MODULE_REGISTRY[code as ModuleCodeValue]!;
							const moduleLabel =
								lang === "fr" ? def.label.fr : def.label.en;
							const description =
								lang === "fr" ? def.description.fr : def.description.en;
							return (
								<Badge
									key={code}
									variant="secondary"
									title={`${description} · ${code}`}
									className="gap-1 text-[11px] px-1.5 py-0.5 font-normal bg-background/60 hover:bg-background border border-border/60"
								>
									<DynamicLucideIcon
										name={def.icon}
										className={cn("h-3 w-3 shrink-0", def.color)}
									/>
									<span className="truncate">{moduleLabel}</span>
								</Badge>
							);
						})}
					</div>
				</div>
			))}

			{unknown.length > 0 && (
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
						Autres
					</p>
					<div className="flex flex-wrap gap-1">
						{unknown.map((code) => (
							<Badge
								key={code}
								variant="outline"
								className="text-[10px] px-1.5 font-normal font-mono"
							>
								{code}
							</Badge>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
