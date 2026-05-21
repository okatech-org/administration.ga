"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTranslation } from "react-i18next";
import { TONE_VAR, type Tone } from "./mock-data";
import { Icon } from "./ui";

// Métadonnées d'affichage par catégorie (icône + tonalité). Le serveur
// renvoie l'id + count ; l'enrichissement visuel reste front.
const CAT_META: Record<
	string,
	{ label: string; icon: string; tone: Tone }
> = {
	tech: { label: "Tech", icon: "Code2", tone: "cyan" },
	health: { label: "Santé", icon: "Stethoscope", tone: "green" },
	education: { label: "Éducation", icon: "GraduationCap", tone: "info" },
	public_service: { label: "Service public", icon: "Landmark", tone: "purple" },
	consulting_services: { label: "Conseil & Services", icon: "Briefcase", tone: "muted" },
	finance: { label: "Finance", icon: "Banknote", tone: "teal" },
	trades: { label: "Métiers manuels", icon: "Hammer", tone: "warning" },
	legal: { label: "Juridique", icon: "Scale", tone: "purple" },
	tourism_hospitality: { label: "Tourisme & Hôtellerie", icon: "Hotel", tone: "cyan" },
	arts_culture: { label: "Arts & Culture", icon: "Palette", tone: "warning" },
	transport: { label: "Transport", icon: "Truck", tone: "info" },
	industry: { label: "Industrie", icon: "Factory", tone: "muted" },
	agriculture: { label: "Agriculture", icon: "Sprout", tone: "green" },
	other: { label: "Autre", icon: "MoreHorizontal", tone: "muted" },
};

export function TabCategories({
	onOpenCategory,
}: {
	onOpenCategory?: (catId: string) => void;
}) {
	const { t } = useTranslation();
	const data = useQuery(api.functions.adminSkills.getCategoryStats, {});

	const loading = data === undefined;
	const totalCounted = data?.totalCategorized ?? 0;

	return (
		<div className="stack stack-4">
			<div className="row items-center justify-between" style={{ gap: 12, flexWrap: "wrap" }}>
				<div>
					<h2>
						{t("superadmin.skills.categories.heading")}{" "}
						<span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 13 }}>
							{t("superadmin.skills.categories.headingSuffix")}
						</span>
					</h2>
					<div className="text-xs text-muted" style={{ marginTop: 2 }}>
						{loading
							? "Chargement…"
							: t("superadmin.skills.categories.intro", { count: totalCounted.toLocaleString("fr-FR") })}
					</div>
				</div>
				<div className="row" style={{ gap: 6 }}>
					<button type="button" className="btn btn-sm btn-soft">
						<Icon name="Download" size={14} />
						{t("superadmin.skills.actions.export")}
					</button>
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
				{loading
					? Array.from({ length: 14 }).map((_, i) => (
						<div
							key={i}
							style={{
								height: 200,
								background: "var(--surface-3)",
								borderRadius: 14,
								opacity: 0.5,
							}}
						/>
					))
					: data.categories
						.filter((c) => c.count > 0)
						.map((cat) => {
							const meta = CAT_META[cat.id] ?? CAT_META.other!;
							const tone = TONE_VAR[meta.tone];
							const pct = Math.round(cat.share * 100);
							return (
								<button
									key={cat.id}
									type="button"
									onClick={() => onOpenCategory?.(cat.id)}
									style={{
										appearance: "none",
										textAlign: "left",
										cursor: "pointer",
										background: "var(--surface)",
										border: "1px solid var(--border)",
										borderRadius: 14,
										padding: 16,
										fontFamily: "inherit",
										color: "var(--text)",
										display: "flex",
										flexDirection: "column",
										gap: 12,
										position: "relative",
										overflow: "hidden",
										transition: "border-color 120ms",
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.borderColor = tone.color;
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.borderColor = "var(--border)";
									}}
								>
									<span
										style={{
											position: "absolute",
											top: 0,
											right: 0,
											width: 80,
											height: 80,
											background: tone.tint,
											borderBottomLeftRadius: 80,
											opacity: 0.55,
											pointerEvents: "none",
										}}
									/>

									<div className="row items-start justify-between" style={{ position: "relative" }}>
										<div className="row items-center" style={{ gap: 10 }}>
											<span
												style={{
													width: 34,
													height: 34,
													borderRadius: 10,
													background: tone.tint,
													color: tone.color,
													display: "grid",
													placeItems: "center",
													flexShrink: 0,
												}}
											>
												<Icon name={meta.icon} size={18} />
											</span>
											<div>
												<div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em" }}>
													{meta.label}
												</div>
												<div className="text-xs text-muted" style={{ marginTop: 2 }}>
													{t("superadmin.skills.categories.diasporaShare", { pct })}
												</div>
											</div>
										</div>
										<div className="ta-center">
											<div
												style={{
													fontFamily: "var(--mono-v2)",
													fontSize: 22,
													fontWeight: 600,
													letterSpacing: "-0.02em",
													lineHeight: 1,
												}}
											>
												{cat.count.toLocaleString("fr-FR")}
											</div>
											<div className="uppercase" style={{ fontSize: 9.5, marginTop: 2 }}>
												{t("superadmin.skills.overview.profilesCountSuffix")}
											</div>
										</div>
									</div>

									{cat.topTitles.length > 0 && (
										<div>
											<div className="uppercase" style={{ marginBottom: 6 }}>
												{t("superadmin.skills.categories.topTitles")}
											</div>
											<div className="stack stack-1" style={{ fontSize: 12, color: "var(--text-muted)" }}>
												{cat.topTitles.slice(0, 4).map(({ title, count }) => (
													<div key={title} className="row items-center justify-between">
														<span style={{ color: "var(--text)" }}>· {title}</span>
														<span className="text-mono text-xs">({count})</span>
													</div>
												))}
											</div>
										</div>
									)}

									<div
										className="row items-center justify-end"
										style={{
											marginTop: "auto",
											paddingTop: 6,
											borderTop: "1px dashed var(--border-soft)",
										}}
									>
										<span
											className="row items-center text-xs"
											style={{ gap: 4, color: tone.color, fontWeight: 500 }}
										>
											{t("superadmin.skills.categories.openProfiles")} <Icon name="ArrowUpRight" size={12} />
										</span>
									</div>
								</button>
							);
						})}
			</div>
		</div>
	);
}
