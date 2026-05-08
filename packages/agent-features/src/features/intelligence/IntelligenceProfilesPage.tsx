"use client";

import { api } from "@convex/_generated/api";
import { useRouter } from "@workspace/routing";
import {
	Building2,
	Baby,
	ChevronLeft,
	ChevronRight,
	Globe,
	Search,
	UserSearch,
	Users,
	UserCircle,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Combobox } from "@workspace/ui/components/combobox";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
	Tabs,
	TabsList,
	TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";

import { useCountryOptions } from "../../hooks/use-country-options";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

import { RiskScoreBadge } from "./RiskScoreBadge";

const PAGE_SIZE = 15;

type IntelTargetType = "profile" | "child_profile" | "diplomatic_target" | "agent";

const TABS: Array<{
	key: string;
	types: IntelTargetType[];
	label: string;
	icon: React.ElementType;
}> = [
	{ key: "all", types: ["profile", "child_profile", "diplomatic_target", "agent"], label: "Tous", icon: UserSearch },
	{ key: "citizens", types: ["profile"], label: "Citoyens", icon: Users },
	{ key: "children", types: ["child_profile"], label: "Mineurs", icon: Baby },
	{ key: "contacts", types: ["diplomatic_target"], label: "Contacts", icon: Building2 },
	{ key: "agents", types: ["agent"], label: "Agents", icon: UserCircle },
];

const ALL_COUNTRIES = "__all__";

const TYPE_META: Record<IntelTargetType, { label: string; icon: React.ElementType; color: string }> = {
	profile: { label: "Citoyen", icon: Users, color: "text-blue-600 dark:text-blue-400" },
	child_profile: { label: "Mineur", icon: Baby, color: "text-amber-600 dark:text-amber-400" },
	diplomatic_target: { label: "Contact", icon: Building2, color: "text-emerald-600 dark:text-emerald-400" },
	agent: { label: "Agent", icon: UserCircle, color: "text-rose-600 dark:text-rose-400" },
};

export default function IntelligenceProfilesPage() {
	const router = useRouter();
	const { activeOrgId } = useOrg();
	const [tab, setTab] = useState("all");
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [country, setCountry] = useState("");
	const [page, setPage] = useState(1);
	const countryOptions = useCountryOptions({ allValue: ALL_COUNTRIES });

	const handleSearchChange = useCallback((value: string) => {
		setSearch(value);
		setPage(1);
		const t = setTimeout(() => setDebouncedSearch(value), 300);
		return () => clearTimeout(t);
	}, []);

	const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0]!;

	const { data: results, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligence.searchProfiles,
		activeOrgId
			? {
					orgId: activeOrgId,
					types: activeTab.types,
					query: debouncedSearch.trim() || undefined,
					country: country.trim() || undefined,
					limit: 200,
				}
			: "skip",
	);

	const totalPages = Math.max(1, Math.ceil((results?.length ?? 0) / PAGE_SIZE));
	const paginated = useMemo(() => {
		if (!results) return [];
		const start = (page - 1) * PAGE_SIZE;
		return results.slice(start, start + PAGE_SIZE);
	}, [results, page]);

	const onTabChange = (k: string) => {
		setTab(k);
		setPage(1);
	};

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto citizen-scrollbar">
			<PageHeader
				icon={<UserSearch className="h-5 w-5 text-rose-500" />}
				title="Profils surveillés"
				subtitle="Recherche multi-cibles : citoyens, mineurs, contacts diplomatiques, agents."
			/>

			{/* Search & filters */}
			<motion.div
				initial={{ opacity: 0, y: 6 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.18 }}
				className="flex flex-col gap-3"
			>
				<div className="flex flex-col md:flex-row gap-2">
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
						<Input
							value={search}
							onChange={(e) => handleSearchChange(e.target.value)}
							placeholder="Rechercher par nom, matricule, identifiant…"
							className="!pl-10 !pr-10 h-10"
						/>
						{search && (
							<button
								type="button"
								onClick={() => handleSearchChange("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
							>
								<X className="h-3.5 w-3.5 text-muted-foreground" />
							</button>
						)}
					</div>
					<Combobox
						options={countryOptions}
						value={country || ALL_COUNTRIES}
						onValueChange={(v) => {
							setCountry(v === ALL_COUNTRIES ? "" : v);
							setPage(1);
						}}
						placeholder="Tous les pays"
						searchPlaceholder="Rechercher un pays…"
						emptyText="Aucun pays."
						className="h-10 md:w-56"
					/>
				</div>

				<Tabs value={tab} onValueChange={onTabChange}>
					<TabsList className="w-full justify-start overflow-x-auto h-9">
						{TABS.map((t) => {
							const Icon = t.icon;
							return (
								<TabsTrigger key={t.key} value={t.key} className="text-xs gap-1.5">
									<Icon className="h-3.5 w-3.5" />
									{t.label}
								</TabsTrigger>
							);
						})}
					</TabsList>
				</Tabs>
			</motion.div>

			{/* Results */}
			{isPending ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							key={i}
							className="rounded-xl border border-border/50 bg-card p-4 space-y-3"
						>
							<div className="flex items-center gap-3">
								<Skeleton className="h-12 w-12 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
							</div>
							<Skeleton className="h-3 w-full" />
						</div>
					))}
				</div>
			) : !results?.length ? (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex flex-col items-center justify-center py-20 text-center"
				>
					<div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
						<UserSearch className="h-8 w-8 text-muted-foreground/40" />
					</div>
					<h3 className="text-base font-semibold mb-1">Aucun profil trouvé</h3>
					<p className="text-sm text-muted-foreground max-w-xs">
						{debouncedSearch || country
							? `Aucun résultat pour ces critères. Modifiez votre recherche.`
							: "Aucune cible n'est référencée dans ce périmètre pour l'instant."}
					</p>
				</motion.div>
			) : (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.15, delay: 0.05 }}
						className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
					>
						<AnimatePresence mode="popLayout">
							{paginated.map((r, i) => (
								<TargetCard
									key={`${r.targetType}:${r.targetId}`}
									result={r}
									index={i}
									searchTerm={debouncedSearch}
									onOpen={() =>
										router.push(`/agence/profiles/${r.targetType}/${r.targetId}`)
									}
								/>
							))}
						</AnimatePresence>
					</motion.div>

					{totalPages > 1 && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="flex items-center justify-between pt-2"
						>
							<p className="text-xs text-muted-foreground">
								{(page - 1) * PAGE_SIZE + 1}–
								{Math.min(page * PAGE_SIZE, results.length)} sur {results.length}
							</p>
							<div className="flex items-center gap-1">
								<Button
									variant="outline"
									size="icon"
									className="h-8 w-8"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								{Array.from({ length: totalPages }, (_, i) => i + 1)
									.filter(
										(p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
									)
									.reduce<(number | "…")[]>((acc, p, idx, arr) => {
										if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push("…");
										acc.push(p);
										return acc;
									}, [])
									.map((p, i) =>
										p === "…" ? (
											<span
												key={`e-${i}`}
												className="text-xs text-muted-foreground px-1"
											>
												…
											</span>
										) : (
											<Button
												key={p}
												variant={p === page ? "default" : "outline"}
												size="icon"
												className="h-8 w-8 text-xs"
												onClick={() => setPage(p as number)}
											>
												{p}
											</Button>
										),
									)}
								<Button
									variant="outline"
									size="icon"
									className="h-8 w-8"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</motion.div>
					)}
				</>
			)}
		</div>
	);
}

interface TargetCardProps {
	result: {
		targetType: IntelTargetType;
		targetId: string;
		label: string;
		sublabel?: string;
		country?: string;
	};
	index: number;
	searchTerm?: string;
	onOpen: () => void;
}

function TargetCard({ result, index, searchTerm, onOpen }: TargetCardProps) {
	const { label, sublabel, country, targetType, targetId } = result;
	const initials = label
		.split(" ")
		.map((s) => s[0])
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase() || "?";
	const meta = TYPE_META[targetType];
	const Icon = meta.icon;

	const highlight = (text: string) => {
		if (!searchTerm || !text) return text;
		const regex = new RegExp(
			`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
			"gi",
		);
		const parts = text.split(regex);
		return parts.map((part, i) =>
			regex.test(part) ? (
				<mark
					key={i}
					className="bg-amber-500/20 text-foreground rounded px-0.5"
				>
					{part}
				</mark>
			) : (
				part
			),
		);
	};

	return (
		<motion.button
			layout
			initial={{ opacity: 0, scale: 0.97 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.97 }}
			transition={{ duration: 0.15, delay: index * 0.02 }}
			type="button"
			onClick={onOpen}
			className="flex flex-col gap-3 p-4 rounded-xl border border-border/50 bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-muted/40 hover:border-rose-500/30 transition-all text-left cursor-pointer w-full"
		>
			<div className="flex items-start gap-3">
				<Avatar className="h-12 w-12 border shrink-0">
					<AvatarFallback
						className={cn("font-semibold text-sm", "bg-rose-500/10", meta.color)}
					>
						{initials}
					</AvatarFallback>
				</Avatar>

				<div className="flex-1 min-w-0">
					<p className="font-semibold text-sm leading-tight truncate">
						{highlight(label)}
					</p>
					{sublabel && (
						<p className="text-[11px] text-muted-foreground truncate mt-0.5">
							{highlight(sublabel)}
						</p>
					)}
					<div className="flex flex-wrap gap-1 mt-1.5">
						<Badge
							variant="outline"
							className={cn(
								"text-[10px] h-4 px-1.5 border-rose-500/20",
								"bg-rose-500/10",
								meta.color,
							)}
						>
							<Icon className="h-2.5 w-2.5 mr-1" />
							{meta.label}
						</Badge>
						{country && (
							<Badge
								variant="outline"
								className="text-[10px] h-4 px-1.5 bg-muted/50 text-muted-foreground border-border/50"
							>
								<Globe className="h-2.5 w-2.5 mr-1" />
								{country}
							</Badge>
						)}
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between pt-0.5 border-t border-border/30">
				<RiskScoreBadge targetType={targetType} targetId={targetId} compact />
				<span className="text-[10px] text-muted-foreground">Voir →</span>
			</div>
		</motion.button>
	);
}
