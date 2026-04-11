/**
 * Affaires Consulaires — Profils Citoyens (agent-web uniquement)
 *
 * Grille de cartes 3×5 = 15 profils/page.
 * Recherche intelligente + tri multi-critères.
 * PÉRIMÈTRE : apps/agent-web UNIQUEMENT — NE PAS MODIFIER citizen-web.
 */

import { api } from "@convex/_generated/api";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
	Search,
	Users,
	FileText,
	CreditCard,
	Clock,
	AlertCircle,
	SortAsc,
	SortDesc,
	ChevronLeft,
	ChevronRight,
	TriangleAlert,
	CheckCircle2,
	X,
	ArrowLeft,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useOrg } from "@/components/org/org-provider";
import { useCanDoTask } from "@/hooks/useCanDoTask";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/affaires-consulaires/profiles/")({
	component: ConsularProfilesPage,
});

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 15; // 3 cols × 5 rows

type SortKey = "requests" | "name_asc" | "name_desc" | "recent" | "score" | "passport_urgency";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
	{ key: "requests", label: "Plus de demandes" },
	{ key: "name_asc", label: "Nom A → Z" },
	{ key: "name_desc", label: "Nom Z → A" },
	{ key: "recent", label: "Plus récents" },
	{ key: "score", label: "Dossier complet" },
	{ key: "passport_urgency", label: "Passeport urgent" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

function ConsularProfilesPage() {
	const navigate = useNavigate();
	const { activeOrgId } = useOrg();
	const { canDo } = useCanDoTask(activeOrgId ?? undefined);

	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [sortKey, setSortKey] = useState<SortKey>("requests");
	const [sortOpen, setSortOpen] = useState(false);
	const [page, setPage] = useState(1);

	// Debounce
	const handleSearchChange = useCallback((value: string) => {
		setSearch(value);
		setPage(1);
		const t = setTimeout(() => setDebouncedSearch(value), 300);
		return () => clearTimeout(t);
	}, []);

	// Realtime Convex WebSocket query
	const profilesRaw = useQuery(
		api.functions.profiles.searchConsularProfiles,
		activeOrgId
			? { orgId: activeOrgId, searchTerm: debouncedSearch || undefined }
			: "skip",
	);

	const isLoading = profilesRaw === undefined;

	// ── Smart Sort ────────────────────────────────────────────────────────────
	const sorted = useMemo(() => {
		if (!profilesRaw) return [];
		const items = [...profilesRaw];
		const now = Date.now();

		switch (sortKey) {
			case "name_asc":
				return items.sort((a, b) => {
					const nameA = `${a.identity?.lastName ?? ""} ${a.identity?.firstName ?? ""}`.trim();
					const nameB = `${b.identity?.lastName ?? ""} ${b.identity?.firstName ?? ""}`.trim();
					return nameA.localeCompare(nameB, "fr");
				});
			case "name_desc":
				return items.sort((a, b) => {
					const nameA = `${a.identity?.lastName ?? ""} ${a.identity?.firstName ?? ""}`.trim();
					const nameB = `${b.identity?.lastName ?? ""} ${b.identity?.firstName ?? ""}`.trim();
					return nameB.localeCompare(nameA, "fr");
				});
			case "recent":
				return items.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
			case "score":
				return items.sort((a, b) => (b.completionScore ?? 0) - (a.completionScore ?? 0));
			case "passport_urgency":
				// Expired first, then soonest expiry
				return items.sort((a, b) => {
					const expA = a.passportInfo?.expiryDate ?? Infinity;
					const expB = b.passportInfo?.expiryDate ?? Infinity;
					const urgA = expA < now ? -1 : expA;
					const urgB = expB < now ? -1 : expB;
					return urgA - urgB;
				});
			case "requests":
			default:
				return items.sort((a, b) => (b.requestCount ?? 0) - (a.requestCount ?? 0));
		}
	}, [profilesRaw, sortKey]);

	// ── Pagination ────────────────────────────────────────────────────────────
	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	// Permission guard
	if (!canDo("profiles.view")) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center gap-4 p-6">
				<div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
					<AlertCircle className="h-8 w-8 text-destructive/60" />
				</div>
				<div>
					<h2 className="text-lg font-semibold">Accès restreint</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Vous n'avez pas les permissions nécessaires pour accéder aux profils citoyens.
					</p>
				</div>
				<Button variant="outline" onClick={() => navigate({ to: "/affaires-consulaires" })}>
					Retour aux Affaires Consulaires
				</Button>
			</div>
		);
	}

	const currentSort = SORT_OPTIONS.find((o) => o.key === sortKey)!;

	return (
		<div className="flex flex-col gap-4 p-4 lg:p-6">

			{/* ── Top bar: back + search + sort ─────────────────────────── */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.18 }}
				className="flex items-center gap-3"
			>
				{/* Back to hub */}
				<Link
					to="/affaires-consulaires"
					className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Affaires Consulaires
				</Link>

				<span className="text-muted-foreground/30 text-sm">/</span>

				<span className="text-sm font-medium">Profils Citoyens</span>

				<Badge variant="secondary" className="text-xs ml-auto shrink-0">
					{isLoading ? "…" : `${sorted.length} profil${sorted.length !== 1 ? "s" : ""}`}
				</Badge>
			</motion.div>

			{/* ── Search + Sort toolbar ─────────────────────────────────── */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.18, delay: 0.04 }}
				className="flex gap-2"
			>
				{/* Search */}
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
					<Input
						placeholder="Nom, prénom, email, N° de passeport…"
						value={search}
						onChange={(e) => handleSearchChange(e.target.value)}
						className="pl-9 h-10 text-sm"
					/>
					{search && (
						<button
							type="button"
							onClick={() => handleSearchChange("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
							aria-label="Effacer la recherche"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					)}
				</div>

				{/* Sort picker */}
				<div className="relative">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setSortOpen(!sortOpen)}
						className="h-10 gap-1.5 text-xs shrink-0"
					>
						{sortKey === "name_desc" ? (
							<SortDesc className="h-3.5 w-3.5" />
						) : (
							<SortAsc className="h-3.5 w-3.5" />
						)}
						<span className="hidden sm:inline">{currentSort.label}</span>
					</Button>
					<AnimatePresence>
						{sortOpen && (
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: -4 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: -4 }}
								transition={{ duration: 0.12 }}
								className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-border/50 bg-popover shadow-lg overflow-hidden"
							>
								{SORT_OPTIONS.map((opt) => (
									<button
										key={opt.key}
										type="button"
										onClick={() => { setSortKey(opt.key); setSortOpen(false); setPage(1); }}
										className={cn(
											"flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-muted/60 transition-colors cursor-pointer",
											opt.key === sortKey && "bg-primary/10 text-primary font-medium",
										)}
									>
										{opt.label}
										{opt.key === sortKey && <CheckCircle2 className="h-3.5 w-3.5" />}
									</button>
								))}
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</motion.div>

			{/* ── Profile Grid ─────────────────────────────────────────── */}
			{isLoading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
							<div className="flex items-center gap-3">
								<Skeleton className="h-12 w-12 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
							</div>
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-8 w-full rounded-lg" />
						</div>
					))}
				</div>
			) : sorted.length === 0 ? (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex flex-col items-center justify-center py-20 text-center"
				>
					<div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
						<Users className="h-8 w-8 text-muted-foreground/40" />
					</div>
					<h3 className="text-base font-semibold mb-1">Aucun profil trouvé</h3>
					<p className="text-sm text-muted-foreground max-w-xs">
						{debouncedSearch
							? `Aucun résultat pour "${debouncedSearch}". Modifiez votre recherche.`
							: "Aucun profil citoyen n'est rattaché à votre organisation pour le moment."}
					</p>
				</motion.div>
			) : (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.15, delay: 0.06 }}
						className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
					>
						<AnimatePresence mode="popLayout">
							{paginated.map((profile: any, i: number) => (
								<ProfileCard
									key={profile._id}
									profile={profile}
									index={i}
									searchTerm={debouncedSearch}
									onOpen={() =>
										navigate({
											to: "/affaires-consulaires/profiles/$profileId",
											params: { profileId: profile._id },
										})
									}
								/>
							))}
						</AnimatePresence>
					</motion.div>

					{/* ── Pagination ─────────────────────────────────────── */}
					{totalPages > 1 && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="flex items-center justify-between pt-2"
						>
							<p className="text-xs text-muted-foreground">
								{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} sur {sorted.length}
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
								{/* Page numbers — show at most 5 */}
								{Array.from({ length: totalPages }, (_, i) => i + 1)
									.filter((p) =>
										p === 1 ||
										p === totalPages ||
										Math.abs(p - page) <= 1
									)
									.reduce<(number | "…")[]>((acc, p, idx, arr) => {
										if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push("…");
										acc.push(p);
										return acc;
									}, [])
									.map((p, i) =>
										p === "…" ? (
											<span key={`ellipsis-${i}`} className="text-xs text-muted-foreground px-1">…</span>
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
										)
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

// ─── Profile Card ─────────────────────────────────────────────────────────────

interface ProfileCardProps {
	profile: any;
	index: number;
	searchTerm?: string;
	onOpen: () => void;
}

function ProfileCard({ profile, index, searchTerm, onOpen }: ProfileCardProps) {
	const firstName = profile.identity?.firstName || "";
	const lastName = profile.identity?.lastName || "";
	const fullName = `${firstName} ${lastName}`.trim() || "Nom inconnu";
	const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "?";
	const email = profile.user?.email || profile.contacts?.email || "";
	const passportNumber = profile.passportInfo?.number;
	const passportExpiry = profile.passportInfo?.expiryDate;
	const now = Date.now();
	const isExpired = passportExpiry && passportExpiry < now;
	const isExpiringSoon = passportExpiry && !isExpired && passportExpiry - now < 90 * 24 * 60 * 60 * 1000;
	const completionScore = profile.completionScore ?? 0;
	const requestCount = profile.requestCount ?? 0;
	const childCount = profile.childCount ?? 0;
	const hasRegistration = !!profile.consularCard?.cardNumber;

	const formatDate = (ts?: number) => {
		if (!ts) return null;
		return format(new Date(ts), "dd/MM/yyyy", { locale: fr });
	};

	// Highlight search term in text
	const highlight = (text: string) => {
		if (!searchTerm || !text) return text;
		const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
		const parts = text.split(regex);
		return parts.map((part, i) =>
			regex.test(part) ? (
				<mark key={i} className="bg-yellow-400/30 text-foreground rounded px-0.5">
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
			className="flex flex-col gap-3 p-4 rounded-xl border border-border/50 bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-muted/40 hover:border-primary/30 transition-all text-left cursor-pointer group w-full"
		>
			{/* ── Top row: avatar + name + badges ── */}
			<div className="flex items-start gap-3">
				<Avatar className="h-12 w-12 border shrink-0">
					{profile.photoUrl || profile.avatarUrl ? (
						<img
							src={profile.photoUrl || profile.avatarUrl}
							alt={fullName}
							className="rounded-full object-cover w-full h-full"
						/>
					) : (
						<AvatarFallback className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
							{initials}
						</AvatarFallback>
					)}
				</Avatar>

				<div className="flex-1 min-w-0">
					<p className="font-semibold text-sm leading-tight truncate">
						{highlight(fullName)}
					</p>
					{email && (
						<p className="text-[11px] text-muted-foreground truncate mt-0.5">
							{highlight(email)}
						</p>
					)}
					<div className="flex flex-wrap gap-1 mt-1.5">
						{hasRegistration && (
							<Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shrink-0">
								<CreditCard className="h-2.5 w-2.5 mr-1" />
								Inscrit
							</Badge>
						)}
						{completionScore >= 80 && (
							<Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0">
								<CheckCircle2 className="h-2.5 w-2.5 mr-1" />
								Complet
							</Badge>
						)}
					</div>
				</div>
			</div>

			{/* ── Passport info ── */}
			{passportNumber && (
				<div className={cn(
					"flex items-center gap-1.5 text-[11px] font-mono rounded-lg px-2.5 py-1.5",
					isExpired
						? "bg-destructive/10 text-destructive"
						: isExpiringSoon
							? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
							: "bg-muted/50 text-muted-foreground",
				)}>
					{(isExpired || isExpiringSoon) && <TriangleAlert className="h-3 w-3 shrink-0" />}
					<span className="flex-1 truncate">{highlight(passportNumber)}</span>
					{passportExpiry && (
						<span className="opacity-70 shrink-0 text-[10px]">
							exp. {formatDate(passportExpiry)}
						</span>
					)}
				</div>
			)}

			{/* ── Footer stats row ── */}
			<div className="flex items-center gap-3 pt-0.5 border-t border-border/30">
				{requestCount > 0 && (
					<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
						<FileText className="h-3.5 w-3.5" />
						<span>{requestCount} dem.</span>
					</div>
				)}
				{childCount > 0 && (
					<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
						<Users className="h-3.5 w-3.5" />
						<span>{childCount} enfant{childCount > 1 ? "s" : ""}</span>
					</div>
				)}
				{profile._creationTime && (
					<div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
						<Clock className="h-3 w-3" />
						<span>{format(new Date(profile._creationTime), "MMM yyyy", { locale: fr })}</span>
					</div>
				)}
			</div>
		</motion.button>
	);
}
