"use client";

import { api } from "@convex/_generated/api";
import { Link } from "@workspace/routing";
import {
	Eye,
	Lock,
	Plus,
	Users,
	Loader2,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type {
	PageAction,
	PageEntity,
} from "../../stores/page-context-store";

const PAGE_SIZE = 12;

const THEMES: Array<{ value: string; label: string }> = [
	{ value: "operational", label: "Opérationnel" },
	{ value: "economic", label: "Économique" },
	{ value: "political", label: "Politique" },
	{ value: "security", label: "Sécurité" },
	{ value: "diaspora", label: "Diaspora" },
	{ value: "event", label: "Événement / visite" },
	{ value: "other", label: "Autre" },
];

const VISIBILITIES: Array<{ value: string; label: string; desc: string }> = [
	{ value: "private", label: "Privée", desc: "Vous seul·e voyez cette liste." },
	{ value: "shared", label: "Partagée", desc: "Tous les agents Renseignement de l'org." },
	{ value: "directorate", label: "Direction", desc: "Cabinet ministériel uniquement." },
];

export default function IntelligenceWatchlistsPage() {
	const { activeOrgId } = useOrg();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [theme, setTheme] = useState("operational");
	const [visibility, setVisibility] = useState("shared");
	const [page, setPage] = useState(1);

	const { data: lists, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligenceWatchlists.list,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const { mutateAsync: createList, isPending: isCreating } =
		useConvexMutationQuery(api.functions.intelligenceWatchlists.create);

	const totalPages = Math.max(1, Math.ceil((lists?.length ?? 0) / PAGE_SIZE));
	const paginated = useMemo(() => {
		if (!lists) return [];
		const start = (page - 1) * PAGE_SIZE;
		return lists.slice(start, start + PAGE_SIZE);
	}, [lists, page]);

	const handleCreate = async () => {
		if (!activeOrgId || !name.trim()) return;
		try {
			await createList({
				orgId: activeOrgId,
				name: name.trim(),
				description: description.trim() || undefined,
				theme: theme as never,
				visibility: visibility as never,
			});
			toast.success("Liste créée");
			setOpen(false);
			setName("");
			setDescription("");
		} catch (_e) {
			toast.error("Impossible de créer la liste");
		}
	};

	// ─── iAsted page context ──────────────────────────────
	const pageEntities: PageEntity[] = paginated.slice(0, 30).map((l: any) => ({
		id: l._id,
		type: "intelligence-watchlist",
		label: l.name ?? "Liste",
		data: {
			theme: l.theme,
			visibility: l.visibility,
			itemCount: l.itemCount,
		},
	}));
	const pageActions: PageAction[] = [
		{
			id: "watchlists.open_create",
			label: "Créer une liste de surveillance",
			description: "Ouvre la modale de création.",
		},
	];
	usePageContext({
		module: "intelligence-watchlists",
		title: "Listes de surveillance",
		summary: `${lists?.length ?? 0} liste(s) · page ${page}/${totalPages}.`,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [],
	});
	useRegisterPageAction("watchlists.open_create", async () => {
		setOpen(true);
		return { success: true };
	});

	return (
		<div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto citizen-scrollbar">
			<PageHeader
				icon={<Eye className="h-5 w-5 text-rose-500" />}
				title="Listes de surveillance"
				subtitle="Regroupez les cibles par dossier thématique."
				actions={
					<Dialog open={open} onOpenChange={setOpen}>
						<DialogTrigger asChild>
							<Button size="sm">
								<Plus className="h-4 w-4 mr-1" /> Nouvelle liste
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Nouvelle liste de surveillance</DialogTitle>
							</DialogHeader>
							<div className="space-y-3">
								<div className="space-y-1">
									<Label className="text-xs" htmlFor="watchlist-name">
										Nom
									</Label>
									<Input
										id="watchlist-name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Ex. Diaspora économique FR"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-xs" htmlFor="watchlist-desc">
										Description
									</Label>
									<Textarea
										id="watchlist-desc"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										rows={2}
										placeholder="Contexte ou objectif de surveillance…"
									/>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-1">
										<Label className="text-xs">Thème</Label>
										<Select value={theme} onValueChange={setTheme}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{THEMES.map((t) => (
													<SelectItem key={t.value} value={t.value}>
														{t.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">Visibilité</Label>
										<Select value={visibility} onValueChange={setVisibility}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{VISIBILITIES.map((v) => (
													<SelectItem key={v.value} value={v.value}>
														{v.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
								<p className="text-[11px] text-muted-foreground">
									{VISIBILITIES.find((v) => v.value === visibility)?.desc}
								</p>
							</div>
							<DialogFooter>
								<Button variant="ghost" onClick={() => setOpen(false)}>
									Annuler
								</Button>
								<Button
									onClick={handleCreate}
									disabled={!name.trim() || isCreating}
								>
									{isCreating && (
										<Loader2 className="h-3 w-3 animate-spin mr-1" />
									)}
									Créer
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				}
			/>

			{isPending ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-[120px] rounded-xl" />
					))}
				</div>
			) : !lists?.length ? (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex flex-col items-center justify-center py-20 text-center"
				>
					<div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
						<Eye className="h-8 w-8 text-muted-foreground/40" />
					</div>
					<h3 className="text-base font-semibold mb-1">Aucune liste</h3>
					<p className="text-sm text-muted-foreground max-w-xs">
						Créez votre première liste de surveillance pour regrouper vos
						cibles par dossier.
					</p>
				</motion.div>
			) : (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
					>
						<AnimatePresence mode="popLayout">
							{paginated.map((l, i) => {
								const VisIcon = l.visibility === "private" ? Lock : Users;
								return (
									<motion.div
										key={l._id}
										layout
										initial={{ opacity: 0, scale: 0.97 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.97 }}
										transition={{ delay: i * 0.02 }}
									>
										<Link href={`/agence/watchlists/${l._id}`}>
											<div className="flex flex-col gap-3 p-4 rounded-xl border border-border/50 bg-[#FDFCFA] dark:bg-[#21201E]/77 hover:bg-muted/40 hover:border-rose-500/30 transition-all cursor-pointer h-full">
												<div className="flex items-start gap-2">
													<div className="rounded-md bg-rose-500/10 p-1.5 shrink-0">
														<Eye className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
													</div>
													<div className="flex-1 min-w-0">
														<p className="font-semibold text-sm leading-tight truncate">
															{l.name}
														</p>
														{l.description && (
															<p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
																{l.description}
															</p>
														)}
													</div>
													<VisIcon className="h-3 w-3 text-muted-foreground shrink-0" />
												</div>

												<div className="flex items-center justify-between pt-2 border-t border-border/30">
													<div className="flex items-center gap-1 flex-wrap">
														{l.theme && (
															<Badge
																variant="outline"
																className={cn(
																	"text-[10px] h-4 px-1.5",
																	"bg-muted/50 text-muted-foreground border-border/50",
																)}
															>
																{THEMES.find((t) => t.value === l.theme)?.label ?? l.theme}
															</Badge>
														)}
														{l.isOwner && (
															<Badge
																variant="outline"
																className="text-[10px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
															>
																À moi
															</Badge>
														)}
													</div>
													<span className="text-[11px] text-muted-foreground">
														{l.itemCount} cible{l.itemCount > 1 ? "s" : ""}
													</span>
												</div>
											</div>
										</Link>
									</motion.div>
								);
							})}
						</AnimatePresence>
					</motion.div>

					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-2">
							<p className="text-xs text-muted-foreground">
								{(page - 1) * PAGE_SIZE + 1}–
								{Math.min(page * PAGE_SIZE, lists.length)} sur {lists.length}
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
								<span className="text-xs text-muted-foreground px-2">
									{page} / {totalPages}
								</span>
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
						</div>
					)}
				</>
			)}
		</div>
	);
}
