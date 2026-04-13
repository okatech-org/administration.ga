/**
 * CitizenContactTab — Annuaire des representations pour la fenetre flottante.
 *
 * Affiche les contacts urgence + standard des representations.
 * Version compacte adaptee a la fenetre iAsted.
 */

import { api } from "@convex/_generated/api";
import {
	Building2,
	ChevronDown,
	ChevronRight,
	Globe,
	Loader2,
	Mail,
	Phone,
	Search,
	Shield,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

const ORG_TYPE_LABELS: Record<string, string> = {
	embassy: "Ambassade",
	general_consulate: "Consulat General",
	consulate: "Consulat",
	permanent_mission: "Mission Permanente",
	high_commission: "Haut-Commissariat",
};

export function CitizenContactTab() {
	const { t } = useTranslation();
	const [search, setSearch] = useState("");

	const { data: allOrgs, isPending } = useAuthenticatedConvexQuery(
		api.functions.orgs.list,
		{},
	);

	const filteredOrgs = useMemo(() => {
		if (!allOrgs) return [];
		const q = search.trim().toLowerCase();
		const orgs = allOrgs as any[];
		if (!q) return orgs;
		return orgs.filter(
			(org) =>
				org.name.toLowerCase().includes(q) ||
				(org.country ?? "").toLowerCase().includes(q),
		);
	}, [allOrgs, search]);

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			{/* Recherche */}
			<div className="px-3 pt-3 pb-1.5 shrink-0">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={t("common.search")}
						className="pl-7 h-8 text-xs"
					/>
				</div>
			</div>

			{/* Notice */}
			<div className="px-3 pb-1.5 shrink-0">
				<div className="rounded-md bg-blue-500/5 border border-blue-500/20 px-2.5 py-1.5">
					<p className="text-[10px] text-blue-600 dark:text-blue-400">
						<Shield className="h-2.5 w-2.5 inline mr-0.5 mb-0.5" />
						Contacts officiels — urgence et standard
					</p>
				</div>
			</div>

			{/* Liste */}
			<ScrollArea className="flex-1 px-3 pb-2">
				{isPending ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				) : filteredOrgs.length === 0 ? (
					<div className="flex flex-col items-center py-8 text-center">
						<Building2 className="h-6 w-6 text-muted-foreground/30 mb-2" />
						<p className="text-[11px] text-muted-foreground">
							{search ? "Aucun resultat" : "Aucune representation"}
						</p>
					</div>
				) : (
					<div className="space-y-1.5">
						{filteredOrgs.map((org: any) => (
							<CompactOrgCard key={org._id} org={org} />
						))}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}

function CompactOrgCard({ org }: { org: any }) {
	const [expanded, setExpanded] = useState(false);

	const emergency = org.emergencyPhone ?? org.emergencyContact;
	const phone = org.phone ?? org.mainPhone;
	const email = org.email;
	const typeLabel = ORG_TYPE_LABELS[org.type] ?? "Representation";

	return (
		<div className="rounded-lg border bg-card overflow-hidden">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-muted/20 transition-colors"
			>
				{expanded
					? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
					: <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
				<div className="flex-1 min-w-0">
					<p className="text-xs font-semibold truncate">{org.name}</p>
					<p className="text-[9px] text-muted-foreground">{typeLabel}</p>
				</div>
				{emergency && (
					<Badge className="text-[8px] h-3.5 px-1 bg-red-500/10 text-red-500 border-red-500/20 shrink-0">
						Urgence
					</Badge>
				)}
			</button>

			{expanded && (
				<div className="px-2.5 pb-2 border-t border-border/40 pt-2 space-y-1.5">
					{emergency && (
						<a href={`tel:${emergency}`} className="flex items-center gap-2 text-[11px] text-red-600 dark:text-red-400 hover:underline">
							<Phone className="h-3 w-3" />
							<span className="font-medium">Urgence :</span> {emergency}
						</a>
					)}
					{phone && (
						<a href={`tel:${phone}`} className="flex items-center gap-2 text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
							<Phone className="h-3 w-3" />
							<span className="font-medium">Standard :</span> {phone}
						</a>
					)}
					{email && (
						<a href={`mailto:${email}`} className="flex items-center gap-2 text-[11px] text-green-600 dark:text-green-400 hover:underline">
							<Mail className="h-3 w-3" />
							{email}
						</a>
					)}
					{org.country && (
						<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
							<Globe className="h-3 w-3" />
							{org.country}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
