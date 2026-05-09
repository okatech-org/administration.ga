/**
 * ParticipantPicker — sélecteur multi-checkbox de participants pour iRéunion.
 *
 * Reprend les patterns iContact (cf. IAstedContactTab) pour éviter de bloquer
 * la page Réunions au montage avec un chargement exhaustif des contacts :
 *
 *   - Pas de hook `useContactSearch` (qui charge tout dès le mount).
 *   - Queries Convex directes par mode actif, avec `"skip"` ailleurs.
 *   - `SEARCH_MIN_LENGTH = 2` avant de déclencher `searchContacts`.
 *   - Mode "Tous"/"Réseau" sans recherche → prompt textuel, aucun chargement.
 *   - Mode "Mon équipe" → `listOrgMembers` (≤ 500 entrées, scope = mon org).
 *   - Debounce 300 ms sur le terme.
 *   - `React.memo` sur le composant + sur la rangée pour découpler du parent
 *     (le formulaire de création contient des inputs `meetingName` /
 *     `description` qui re-rendaient toute la liste à chaque keystroke).
 */

"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	Building2,
	Check,
	Globe,
	Loader2,
	Search,
	Shield,
	Users,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import type { ContactResultItem } from "../../hooks/useContactSearch";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;

type Source = "all" | "team" | "network";

const SEGMENTS: Array<{ id: Source; label: string; icon: typeof Users }> = [
	{ id: "all", label: "Tous", icon: Users },
	{ id: "team", label: "Équipe", icon: Shield },
	{ id: "network", label: "Réseau", icon: Globe },
];

function useDebouncedValue<T>(value: T, delay: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const handle = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(handle);
	}, [value, delay]);
	return debounced;
}

interface ParticipantPickerProps {
	activeOrgId: Id<"orgs"> | null;
	selectedParticipants: Set<string>;
	onToggle: (userId: string) => void;
}

function ParticipantPickerInner({
	activeOrgId,
	selectedParticipants,
	onToggle,
}: ParticipantPickerProps) {
	const [searchTerm, setSearchTerm] = useState("");
	const [source, setSource] = useState<Source>("all");
	const debouncedSearch = useDebouncedValue(searchTerm, SEARCH_DEBOUNCE_MS);
	const isSearchPending = searchTerm !== debouncedSearch;
	const hasUsableSearch = debouncedSearch.trim().length >= SEARCH_MIN_LENGTH;

	// Mode actif :
	// - "team"   : segment équipe → listOrgMembers (light, scope = mon org)
	// - "search" : recherche ≥ 2 chars dans Tous/Réseau → searchContacts
	// - "prompt" : Tous/Réseau sans recherche → message, aucun chargement
	const mode: "team" | "search" | "prompt" =
		source === "team"
			? "team"
			: hasUsableSearch
				? "search"
				: "prompt";

	// ── Mode "team" ────────────────────────────────────────────────
	const { data: teamData, isPending: teamPending } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.listOrgMembers,
		mode === "team" && activeOrgId
			? {
					orgId: activeOrgId,
					searchTerm: debouncedSearch || undefined,
					sort: "asc" as const,
				}
			: "skip",
	);

	// ── Mode "search" ──────────────────────────────────────────────
	const searchScope: "jurisdiction" | "all-diplomatic" =
		source === "network" ? "all-diplomatic" : "jurisdiction";

	const { data: searchData, isPending: searchPending } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.searchContacts,
		mode === "search" && activeOrgId
			? {
					myOrgId: activeOrgId,
					searchTerm: debouncedSearch,
					source: source !== "all" ? source : undefined,
					scope: searchScope,
				}
			: "skip",
	);

	const searchResults = useMemo<ContactResultItem[]>(() => {
		if (!searchData) return [];
		const flat: ContactResultItem[] = [];
		for (const g of (searchData.groups ?? []) as Array<{
			contacts: ContactResultItem[];
		}>) {
			for (const c of g.contacts) flat.push(c);
		}
		flat.sort((a, b) =>
			`${a.lastName} ${a.firstName}`.localeCompare(
				`${b.lastName} ${b.firstName}`,
				"fr",
				{ sensitivity: "base" },
			),
		);
		return flat;
	}, [searchData]);

	const teamResults = (teamData?.contacts ?? []) as ContactResultItem[];

	const isPending =
		(mode === "team" && teamPending) ||
		(mode === "search" && (searchPending || isSearchPending));

	const visibleContacts: ContactResultItem[] =
		mode === "team" ? teamResults : mode === "search" ? searchResults : [];

	// Regrouper par org pour l'affichage (header sticky + sous-liste)
	const groups = useMemo(() => {
		const byOrg = new Map<string, { name: string; country?: string; contacts: ContactResultItem[] }>();
		for (const c of visibleContacts) {
			const key = c.orgId;
			const entry = byOrg.get(key);
			if (entry) entry.contacts.push(c);
			else byOrg.set(key, { name: c.orgName, country: c.orgCountry, contacts: [c] });
		}
		return Array.from(byOrg.entries()).map(([orgId, v]) => ({
			orgId,
			name: v.name,
			country: v.country,
			contacts: v.contacts,
		}));
	}, [visibleContacts]);

	return (
		<div className="space-y-2">
			{/* Recherche */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
				<Input
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					placeholder="Rechercher (nom, poste, org)..."
					className="h-9 !pl-10 text-xs"
					aria-label="Rechercher un participant"
				/>
				{isSearchPending && (
					<Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
				)}
			</div>

			{/* Segments */}
			<div className="flex items-center gap-1" role="tablist" aria-label="Périmètre">
				{SEGMENTS.map((seg) => (
					<button
						key={seg.id}
						type="button"
						role="tab"
						aria-selected={source === seg.id}
						onClick={() => setSource(seg.id)}
						className={cn(
							"text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors",
							source === seg.id
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:bg-muted",
						)}
					>
						{seg.label}
					</button>
				))}
			</div>

			{/* Liste */}
			<div className="max-h-[200px] overflow-y-auto border rounded-lg">
				{isPending ? (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				) : mode === "prompt" ? (
					<PromptHint scope={source} />
				) : groups.length === 0 ? (
					<p className="text-xs text-muted-foreground text-center py-4">
						{debouncedSearch ? "Aucun résultat" : "Aucun contact"}
					</p>
				) : (
					groups.map((group) => (
						<div key={group.orgId}>
							<div className="flex items-center gap-1.5 px-3 py-1 bg-muted/20 sticky top-0">
								<Building2 className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
								<span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
									{group.name}
								</span>
								{group.country && (
									<span className="text-[7px] text-muted-foreground/60">
										{group.country}
									</span>
								)}
							</div>
							{group.contacts.map((c) => (
								<ContactRow
									key={c.id}
									contact={c}
									isSelected={selectedParticipants.has(c.userId)}
									onToggle={onToggle}
								/>
							))}
						</div>
					))
				)}
			</div>
		</div>
	);
}

function PromptHint({ scope }: { scope: Source }) {
	return (
		<div className="flex flex-col items-center justify-center py-6 text-center px-4 gap-2">
			<div className="rounded-full bg-primary/10 p-2">
				<Search className="h-3.5 w-3.5 text-primary" />
			</div>
			<p className="text-[11px] font-medium">Saisissez un nom pour rechercher</p>
			<p className="text-[10px] text-muted-foreground max-w-[220px]">
				{scope === "network"
					? "La recherche couvre l'ensemble du corps diplomatique."
					: "La liste complète n'est pas chargée par défaut. Tapez au moins 2 caractères."}
			</p>
		</div>
	);
}

interface ContactRowProps {
	contact: ContactResultItem;
	isSelected: boolean;
	onToggle: (userId: string) => void;
}

const ContactRow = memo(function ContactRow({
	contact,
	isSelected,
	onToggle,
}: ContactRowProps) {
	const handleToggle = useCallback(
		() => onToggle(contact.userId),
		[onToggle, contact.userId],
	);
	const initials = (contact.name ?? "")
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<label
			className={cn(
				"flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors",
				isSelected ? "bg-primary/5" : "hover:bg-muted/30",
			)}
		>
			<Checkbox
				checked={isSelected}
				onCheckedChange={handleToggle}
				className="h-4 w-4"
			/>
			<Avatar className="h-7 w-7">
				<AvatarImage src={contact.avatar} />
				<AvatarFallback
					className={cn(
						"text-[9px]",
						contact.source === "team"
							? "bg-primary/10 text-primary"
							: "bg-muted text-muted-foreground",
					)}
				>
					{initials}
				</AvatarFallback>
			</Avatar>
			<div className="flex-1 min-w-0">
				<p className="text-xs font-medium truncate">
					{contact.lastName} {contact.firstName}
				</p>
				<p className="text-[10px] text-muted-foreground truncate">
					{contact.position}
				</p>
			</div>
			{isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
		</label>
	);
});

export const ParticipantPicker = memo(ParticipantPickerInner);
