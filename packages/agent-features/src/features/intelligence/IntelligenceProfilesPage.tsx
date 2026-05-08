"use client";

import { api } from "@convex/_generated/api";
import { Link } from "@workspace/routing";
import { Loader2, Search, UserSearch } from "lucide-react";
import { useState } from "react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Input } from "@workspace/ui/components/input";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@workspace/ui/components/tabs";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

import { RiskScoreBadge } from "./RiskScoreBadge";

type IntelTargetType = "profile" | "child_profile" | "diplomatic_target" | "agent";

const TYPE_LABELS: Record<IntelTargetType, string> = {
	profile: "Citoyens",
	child_profile: "Mineurs",
	diplomatic_target: "Contacts",
	agent: "Agents",
};

const TABS: Array<{ key: string; types: IntelTargetType[]; label: string }> = [
	{ key: "all", types: ["profile", "child_profile", "diplomatic_target", "agent"], label: "Tous" },
	{ key: "citizens", types: ["profile"], label: "Citoyens" },
	{ key: "children", types: ["child_profile"], label: "Mineurs" },
	{ key: "contacts", types: ["diplomatic_target"], label: "Contacts" },
	{ key: "agents", types: ["agent"], label: "Agents" },
];

export default function IntelligenceProfilesPage() {
	const { activeOrgId } = useOrg();
	const [tab, setTab] = useState("all");
	const [query, setQuery] = useState("");
	const [country, setCountry] = useState("");

	const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0]!;

	const { data: results, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligence.searchProfiles,
		activeOrgId
			? {
					orgId: activeOrgId,
					types: activeTab.types,
					query: query.trim() || undefined,
					country: country.trim() || undefined,
					limit: 100,
				}
			: "skip",
	);

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 max-w-6xl mx-auto w-full">
			<PageHeader
				icon={<UserSearch className="h-5 w-5 text-rose-500" />}
				title="Profils surveillés"
				subtitle="Recherche multi-cibles : citoyens, mineurs, contacts diplomatiques, agents."
			/>

			<FlatCard className="p-3 space-y-3">
				<div className="flex flex-col md:flex-row gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Nom, matricule…"
							className="pl-8"
						/>
					</div>
					<Input
						value={country}
						onChange={(e) => setCountry(e.target.value.toUpperCase())}
						placeholder="Code pays (ex. FR, GA)"
						className="md:w-48"
						maxLength={2}
					/>
				</div>

				<Tabs value={tab} onValueChange={setTab}>
					<TabsList className="w-full justify-start overflow-x-auto">
						{TABS.map((t) => (
							<TabsTrigger key={t.key} value={t.key}>
								{t.label}
							</TabsTrigger>
						))}
					</TabsList>

					{TABS.map((t) => (
						<TabsContent key={t.key} value={t.key} className="mt-3">
							{isPending ? (
								<div className="flex items-center justify-center py-8 text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Recherche…
								</div>
							) : !results?.length ? (
								<p className="text-sm text-muted-foreground py-8 text-center">
									Aucun résultat.
								</p>
							) : (
								<div className="divide-y divide-foreground/5">
									{results.map((r) => (
										<Link
											key={`${r.targetType}:${r.targetId}`}
											href={`/intelligence/profiles/${r.targetType}/${r.targetId}`}
											className="flex items-center justify-between py-2.5 px-2 hover:bg-foreground/5 rounded-md transition-colors"
										>
											<div className="min-w-0">
												<p className="text-sm font-medium truncate">{r.label}</p>
												{r.sublabel && (
													<p className="text-xs text-muted-foreground truncate">
														{r.sublabel}
													</p>
												)}
											</div>
											<div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
												<RiskScoreBadge
													targetType={r.targetType}
													targetId={r.targetId}
													compact
												/>
												{r.country && <span>{r.country}</span>}
												<span className="px-1.5 py-0.5 rounded bg-foreground/5">
													{TYPE_LABELS[r.targetType]}
												</span>
											</div>
										</Link>
									))}
								</div>
							)}
						</TabsContent>
					))}
				</Tabs>
			</FlatCard>
		</div>
	);
}
