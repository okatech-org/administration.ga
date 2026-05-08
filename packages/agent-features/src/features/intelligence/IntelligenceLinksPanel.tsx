"use client";

import { api } from "@convex/_generated/api";
import { Link } from "@workspace/routing";
import {
	ArrowDownLeft,
	ArrowUpRight,
	Loader2,
	Network,
	Plus,
	Search,
	Trash2,
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
import { useOrg } from "../../shell/org-provider";

const RELATIONSHIP_LABELS: Record<string, string> = {
	family: "Famille",
	business: "Affaires",
	friendship: "Amitié",
	mentor: "Mentor",
	suspect: "Suspect",
	accomplice: "Complice",
	contact: "Contact",
	other: "Autre",
};

const STRENGTH_LABELS: Record<string, string> = {
	weak: "Faible",
	medium: "Moyenne",
	strong: "Forte",
};

const STRENGTH_CLASSES: Record<string, string> = {
	weak: "bg-muted/50 text-muted-foreground border-border/50",
	medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
	strong: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const TYPE_OPTIONS: Array<{
	value: "profile" | "child_profile" | "diplomatic_target" | "agent";
	label: string;
}> = [
	{ value: "profile", label: "Citoyen" },
	{ value: "child_profile", label: "Mineur" },
	{ value: "diplomatic_target", label: "Contact diplomatique" },
	{ value: "agent", label: "Agent" },
];

interface Props {
	targetType: "profile" | "child_profile" | "diplomatic_target" | "agent";
	targetId: string;
}

export function IntelligenceLinksPanel({ targetType, targetId }: Props) {
	const { activeOrgId } = useOrg();
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [pickedType, setPickedType] = useState<
		"profile" | "child_profile" | "diplomatic_target" | "agent"
	>("profile");
	const [pickedId, setPickedId] = useState<string | null>(null);
	const [pickedLabel, setPickedLabel] = useState<string>("");
	const [relationship, setRelationship] = useState("contact");
	const [strength, setStrength] = useState("medium");
	const [verified, setVerified] = useState("unverified");
	const [description, setDescription] = useState("");

	const { data: links, isLoading } = useAuthenticatedConvexQuery(
		api.functions.intelligenceLinks.listForTarget,
		activeOrgId ? { orgId: activeOrgId, targetType, targetId } : "skip",
	);

	const { data: searchResults, isPending: isSearching } =
		useAuthenticatedConvexQuery(
			api.functions.intelligence.searchProfiles,
			activeOrgId && open && searchQuery.trim().length >= 2
				? {
						orgId: activeOrgId,
						types: [pickedType],
						query: searchQuery.trim(),
						limit: 10,
					}
				: "skip",
		);

	const { mutateAsync: createLink, isPending: isCreating } =
		useConvexMutationQuery(api.functions.intelligenceLinks.create);
	const { mutateAsync: removeLink } = useConvexMutationQuery(
		api.functions.intelligenceLinks.remove,
	);

	const filteredResults = useMemo(() => {
		return (searchResults ?? []).filter(
			(r) => !(r.targetType === targetType && r.targetId === targetId),
		);
	}, [searchResults, targetType, targetId]);

	const resetForm = () => {
		setOpen(false);
		setSearchQuery("");
		setPickedId(null);
		setPickedLabel("");
		setDescription("");
		setRelationship("contact");
		setStrength("medium");
		setVerified("unverified");
	};

	const handleCreate = async () => {
		if (!activeOrgId || !pickedId) return;
		try {
			await createLink({
				orgId: activeOrgId,
				fromTargetType: targetType,
				fromTargetId: targetId,
				toTargetType: pickedType,
				toTargetId: pickedId,
				relationship: relationship as never,
				strength: strength as never,
				verified: verified as never,
				description: description.trim() || undefined,
			});
			toast.success("Lien créé");
			resetForm();
		} catch (_e) {
			toast.error("Impossible de créer le lien");
		}
	};

	const handleRemove = async (linkId: string) => {
		if (!activeOrgId) return;
		try {
			await removeLink({ linkId: linkId as never, orgId: activeOrgId });
			toast.success("Lien supprimé");
		} catch (_e) {
			toast.error("Impossible de supprimer le lien");
		}
	};

	return (
		<FlatCard>
			<div className="flex items-center gap-2.5 rounded-t-xl bg-muted/40 px-4 py-3 border-b border-border/50">
				<div className="rounded-md bg-blue-500/10 p-1.5">
					<Network className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
				</div>
				<span className="text-base font-bold flex-1">Réseau de relations</span>
				{links && links.length > 0 && (
					<Badge
						variant="outline"
						className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground border-border/50"
					>
						{links.length}
					</Badge>
				)}
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button size="sm" variant="outline" className="h-7">
							<Plus className="h-3 w-3 mr-1" /> Lien
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-lg">
						<DialogHeader>
							<DialogTitle>Nouveau lien</DialogTitle>
						</DialogHeader>
						<div className="space-y-3">
							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1">
									<Label className="text-xs">Type de cible</Label>
									<Select
										value={pickedType}
										onValueChange={(v) => {
											setPickedType(v as never);
											setPickedId(null);
											setPickedLabel("");
										}}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{TYPE_OPTIONS.map((t) => (
												<SelectItem key={t.value} value={t.value}>
													{t.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<Label className="text-xs">Relation</Label>
									<Select value={relationship} onValueChange={setRelationship}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => (
												<SelectItem key={k} value={k}>
													{v}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="space-y-1">
								<Label className="text-xs">Cible liée</Label>
								{pickedId ? (
									<div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 p-2 text-sm">
										<span className="truncate">{pickedLabel}</span>
										<Button
											variant="ghost"
											size="sm"
											className="h-7"
											onClick={() => {
												setPickedId(null);
												setPickedLabel("");
											}}
										>
											Changer
										</Button>
									</div>
								) : (
									<>
										<div className="relative">
											<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
											<Input
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
												placeholder="Rechercher (≥ 2 caractères)…"
												className="pl-9"
											/>
										</div>
										{isSearching ? (
											<div className="text-xs text-muted-foreground py-2 flex items-center justify-center">
												<Loader2 className="h-3 w-3 animate-spin mr-1" />
												Recherche…
											</div>
										) : filteredResults.length > 0 ? (
											<div className="border border-border/50 rounded-md max-h-48 overflow-y-auto divide-y divide-border/30">
												{filteredResults.map((r) => (
													<button
														type="button"
														key={`${r.targetType}:${r.targetId}`}
														onClick={() => {
															setPickedId(r.targetId);
															setPickedLabel(r.label);
														}}
														className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex items-center justify-between gap-2"
													>
														<span className="truncate">{r.label}</span>
														{r.country && (
															<span className="text-[10px] text-muted-foreground">
																{r.country}
															</span>
														)}
													</button>
												))}
											</div>
										) : searchQuery.trim().length >= 2 ? (
											<p className="text-xs text-muted-foreground py-2 text-center">
												Aucun résultat.
											</p>
										) : null}
									</>
								)}
							</div>

							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1">
									<Label className="text-xs">Force</Label>
									<Select value={strength} onValueChange={setStrength}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="weak">Faible</SelectItem>
											<SelectItem value="medium">Moyenne</SelectItem>
											<SelectItem value="strong">Forte</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<Label className="text-xs">Vérification</Label>
									<Select value={verified} onValueChange={setVerified}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="unverified">Non vérifié</SelectItem>
											<SelectItem value="confirmed">Confirmé</SelectItem>
											<SelectItem value="disputed">Contesté</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="space-y-1">
								<Label className="text-xs">Description</Label>
								<Textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={2}
									placeholder="Contexte de la relation…"
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="ghost" onClick={resetForm}>
								Annuler
							</Button>
							<Button
								onClick={handleCreate}
								disabled={!pickedId || isCreating}
							>
								{isCreating && (
									<Loader2 className="h-3 w-3 animate-spin mr-1" />
								)}
								Créer le lien
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<div className="p-4">
				{isLoading ? (
					<div className="space-y-2">
						<Skeleton className="h-12 w-full rounded-lg" />
						<Skeleton className="h-12 w-full rounded-lg" />
					</div>
				) : !links?.length ? (
					<p className="text-xs text-muted-foreground py-6 text-center">
						Aucun lien renseigné pour cette cible.
					</p>
				) : (
					<div className="space-y-2">
						<AnimatePresence mode="popLayout">
							{links.map((l) => (
								<motion.div
									key={l._id}
									layout
									initial={{ opacity: 0, y: 4 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 4 }}
									className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border border-border/30 hover:border-border/50 transition-colors"
								>
									<Link
										href={`/agence/profiles/${l.otherType}/${l.otherId}`}
										className="flex items-center gap-2 flex-1 min-w-0"
									>
										{l.direction === "outgoing" ? (
											<ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
										) : (
											<ArrowDownLeft className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
										)}
										<span className="text-sm font-medium truncate flex-1">
											{l.otherLabel}
										</span>
									</Link>
									<Badge
										variant="outline"
										className="text-[10px] h-5 px-2 bg-muted/50 text-muted-foreground border-border/50"
									>
										{RELATIONSHIP_LABELS[l.relationship] ?? l.relationship}
									</Badge>
									{l.strength && (
										<Badge
											variant="outline"
											className={cn(
												"text-[10px] h-5 px-2",
												STRENGTH_CLASSES[l.strength] ?? "",
											)}
										>
											{STRENGTH_LABELS[l.strength] ?? l.strength}
										</Badge>
									)}
									{l.direction === "outgoing" && (
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0"
											onClick={() => handleRemove(l._id)}
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									)}
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				)}
			</div>
		</FlatCard>
	);
}
