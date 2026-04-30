"use client";

/**
 * Recherche unifiée iCorrespondance + iDocument.
 *
 * Backend : `convex/functions/unifiedSearch.search` (Phase 5 — alignement).
 * Trigger : Cmd/Ctrl + Shift + F (Cmd+K est déjà pris par iAsted side panel).
 * UX : dialog modal avec input + deux colonnes résultats (Courriers / Documents)
 * + click → navigation vers le module concerné.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	FileText,
	Loader2,
	Mail,
	Search as SearchIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { useRouter } from "@workspace/routing";
import { cn } from "@workspace/ui/lib/utils";

import { useOrg } from "./org-provider";

const MD_BREAKPOINT = "(min-width: 768px)";

/**
 * Hook qui expose `isOpen` + `open` + `close` + le binding clavier
 * Cmd/Ctrl + Shift + F (la combinaison la plus proche d'une recherche globale
 * disponible sans collision avec iAsted Cmd+K).
 */
/** Custom event utilisé par les triggers distants (sidebar, FAB, etc.). */
const OPEN_EVENT = "unified-search:open";

/**
 * Dispatch un event qu'écoute toute instance de `useUnifiedSearch` dans le
 * DOM. Utilisé pour ouvrir le dialog depuis n'importe où sans partager un
 * Context React.
 */
export function dispatchOpenUnifiedSearch() {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event(OPEN_EVENT));
}

export function useUnifiedSearch() {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const isCmdShiftF =
				(e.metaKey || e.ctrlKey) &&
				e.shiftKey &&
				e.key.toLowerCase() === "f";
			if (!isCmdShiftF) return;
			if (typeof window === "undefined") return;
			if (!window.matchMedia(MD_BREAKPOINT).matches) return;
			e.preventDefault();
			setIsOpen((c) => !c);
		};
		const onOpenEvent = () => setIsOpen(true);
		window.addEventListener("keydown", onKey);
		window.addEventListener(OPEN_EVENT, onOpenEvent);
		return () => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener(OPEN_EVENT, onOpenEvent);
		};
	}, []);

	const open = useCallback(() => setIsOpen(true), []);
	const close = useCallback(() => setIsOpen(false), []);
	const toggle = useCallback(() => setIsOpen((c) => !c), []);
	return { isOpen, open, close, toggle };
}

interface UnifiedSearchDialogProps {
	open: boolean;
	onClose: () => void;
}

export function UnifiedSearchDialog({ open, onClose }: UnifiedSearchDialogProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const { activeOrgId } = useOrg();
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	useEffect(() => {
		const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
		return () => clearTimeout(id);
	}, [search]);

	// Reset au close
	useEffect(() => {
		if (!open) {
			setSearch("");
			setDebouncedSearch("");
		}
	}, [open]);

	const isSearching = debouncedSearch.length >= 2;

	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.unifiedSearch.search,
		open && isSearching && activeOrgId
			? {
					orgId: activeOrgId as Id<"orgs">,
					searchText: debouncedSearch,
					limit: 20,
				}
			: "skip",
	);

	const correspondance = useMemo(
		() => (data?.correspondance ?? []) as any[],
		[data],
	);
	const documents = useMemo(() => (data?.documents ?? []) as any[], [data]);
	const isEmpty =
		isSearching && !isPending && correspondance.length === 0 && documents.length === 0;

	const goCorrespondance = useCallback(
		(itemId: string) => {
			router.push(`/icorrespondance?tab=correspondance&id=${itemId}`);
			onClose();
		},
		[router, onClose],
	);

	const goDocument = useCallback(
		(docId: string) => {
			router.push(`/idocument?id=${docId}`);
			onClose();
		},
		[router, onClose],
	);

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<SearchIcon className="h-4 w-4" />
						{t("unifiedSearch.title", "Recherche globale")}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<div className="relative">
						<SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={t(
								"unifiedSearch.placeholder",
								"Rechercher dans les courriers et les documents…",
							)}
							className="pl-9"
							autoFocus
						/>
					</div>

					{!isSearching && (
						<p className="px-1 py-8 text-center text-xs text-muted-foreground">
							{t(
								"unifiedSearch.hint",
								"Tapez au moins 2 caractères pour lancer la recherche.",
							)}
						</p>
					)}

					{isPending && isSearching && (
						<div className="flex items-center justify-center py-10">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					)}

					{isEmpty && (
						<p className="px-1 py-8 text-center text-xs text-muted-foreground">
							{t("unifiedSearch.empty", "Aucun résultat trouvé.")}
						</p>
					)}

					{isSearching && !isPending && (correspondance.length > 0 || documents.length > 0) && (
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
							{/* ── Courriers ── */}
							<section className="space-y-1.5">
								<h3 className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
									<Mail className="h-3 w-3" />
									{t("unifiedSearch.correspondance", "Courriers")} ({correspondance.length})
								</h3>
								<ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
									{correspondance.length === 0 ? (
										<li className="px-2 py-3 text-[11px] text-muted-foreground/70">
											{t("unifiedSearch.noneCorr", "Aucun courrier")}
										</li>
									) : (
										correspondance.map((c) => (
											<li key={c._id}>
												<button
													type="button"
													onClick={() => goCorrespondance(c._id)}
													className={cn(
														"flex w-full flex-col gap-0.5 rounded-md border border-border/40 px-3 py-2 text-left transition-colors",
														"hover:border-primary/40 hover:bg-primary/5",
													)}
												>
													<span className="font-mono text-[10px] text-muted-foreground">
														{c.reference}
													</span>
													<span className="truncate text-xs font-medium">
														{c.title}
													</span>
													<span className="truncate text-[11px] text-muted-foreground">
														{c.senderName} → {c.recipientName}
													</span>
												</button>
											</li>
										))
									)}
								</ul>
							</section>

							{/* ── Documents ── */}
							<section className="space-y-1.5">
								<h3 className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
									<FileText className="h-3 w-3" />
									{t("unifiedSearch.documents", "Documents")} ({documents.length})
								</h3>
								<ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
									{documents.length === 0 ? (
										<li className="px-2 py-3 text-[11px] text-muted-foreground/70">
											{t("unifiedSearch.noneDoc", "Aucun document")}
										</li>
									) : (
										documents.map((d) => (
											<li key={d._id}>
												<button
													type="button"
													onClick={() => goDocument(d._id)}
													className={cn(
														"flex w-full flex-col gap-0.5 rounded-md border border-border/40 px-3 py-2 text-left transition-colors",
														"hover:border-primary/40 hover:bg-primary/5",
													)}
												>
													<span className="truncate text-xs font-medium">
														{d.label}
													</span>
													<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
														{d.category && <span>{d.category}</span>}
														{d.originType === "correspondance" && (
															<span className="rounded-sm bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
																Courrier
															</span>
														)}
													</div>
												</button>
											</li>
										))
									)}
								</ul>
							</section>
						</div>
					)}

					<p className="px-1 pt-1 text-[10px] text-muted-foreground/60">
						{t(
							"unifiedSearch.shortcut",
							"Astuce : ouvrez cette recherche avec Cmd/Ctrl + Shift + F.",
						)}
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Bouton trigger réutilisable. Affiche une icône + label compact, dispatch un
 * event que `useUnifiedSearch` écoute pour ouvrir le dialog. Pas besoin de
 * partager un Context : le dialog est mounté une fois dans `AppShell` et
 * réagit à l'event peu importe d'où vient le click.
 */
export function UnifiedSearchTrigger({ expanded }: { expanded: boolean }) {
	const { t } = useTranslation();
	return (
		<button
			type="button"
			onClick={dispatchOpenUnifiedSearch}
			title={t("unifiedSearch.title", "Recherche globale (Cmd+Shift+F)")}
			className={cn(
				"flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 text-xs text-muted-foreground transition-colors",
				"hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
				expanded
					? "w-full px-3 py-2"
					: "h-11 w-11 justify-center px-0 py-0",
			)}
		>
			<SearchIcon className="h-3.5 w-3.5 shrink-0" />
			{expanded && (
				<>
					<span className="flex-1 text-left">
						{t("unifiedSearch.trigger", "Recherche globale")}
					</span>
					<kbd className="rounded border border-border/50 bg-muted/40 px-1 text-[9px] font-mono text-muted-foreground">
						⇧⌘F
					</kbd>
				</>
			)}
		</button>
	);
}
