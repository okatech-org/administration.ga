"use client";

import { api } from "@convex/_generated/api";
import { Link } from "@workspace/routing";
import { Eye, Lock, Plus, Users, Loader2 } from "lucide-react";
import { useState } from "react";
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
import { Textarea } from "@workspace/ui/components/textarea";

import { FlatCard } from "../../components/my-space/flat-card";
import { PageHeader } from "../../components/my-space/page-header";
import { useOrg } from "../../shell/org-provider";

const THEMES: Array<{ value: string; label: string }> = [
	{ value: "economic", label: "Économique" },
	{ value: "political", label: "Politique" },
	{ value: "security", label: "Sécurité" },
	{ value: "diaspora", label: "Diaspora" },
	{ value: "event", label: "Événement / visite" },
	{ value: "operational", label: "Opérationnel" },
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

	const { data: lists, isPending } = useAuthenticatedConvexQuery(
		api.functions.intelligenceWatchlists.list,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const { mutateAsync: createList, isPending: isCreating } =
		useConvexMutationQuery(api.functions.intelligenceWatchlists.create);

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

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4 max-w-6xl mx-auto w-full">
			<PageHeader
				icon={<Eye className="h-5 w-5 text-rose-500" />}
				title="Listes de surveillance"
				subtitle="Regroupez les cibles par dossier thématique."
			/>

			<div className="flex justify-end">
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
								<Label htmlFor="watchlist-name">Nom</Label>
								<Input
									id="watchlist-name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Ex. Diaspora économique FR"
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="watchlist-desc">Description</Label>
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
									<Label>Thème</Label>
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
									<Label>Visibilité</Label>
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
							<p className="text-xs text-muted-foreground">
								{VISIBILITIES.find((v) => v.value === visibility)?.desc}
							</p>
						</div>
						<DialogFooter>
							<Button variant="ghost" onClick={() => setOpen(false)}>
								Annuler
							</Button>
							<Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
								{isCreating ? (
									<Loader2 className="h-4 w-4 animate-spin mr-1" />
								) : null}
								Créer
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{isPending ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					Chargement…
				</div>
			) : !lists?.length ? (
				<FlatCard className="p-8 text-center text-sm text-muted-foreground">
					Aucune liste pour l'instant. Créez-en une pour commencer.
				</FlatCard>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{lists.map((l) => (
						<Link key={l._id} href={`/intelligence/watchlists/${l._id}`}>
							<FlatCard className="p-4 space-y-2 hover:bg-foreground/5 transition-colors">
								<div className="flex items-center gap-2">
									<h3 className="font-medium text-sm flex-1 truncate">{l.name}</h3>
									{l.visibility === "private" ? (
										<Lock className="h-3 w-3 text-muted-foreground" />
									) : (
										<Users className="h-3 w-3 text-muted-foreground" />
									)}
								</div>
								{l.description && (
									<p className="text-xs text-muted-foreground line-clamp-2">
										{l.description}
									</p>
								)}
								<div className="flex items-center gap-2 text-xs">
									{l.theme && (
										<Badge variant="outline" className="text-[10px]">
											{THEMES.find((t) => t.value === l.theme)?.label ?? l.theme}
										</Badge>
									)}
									<span className="ml-auto text-muted-foreground">
										{l.itemCount} cible{l.itemCount > 1 ? "s" : ""}
									</span>
								</div>
							</FlatCard>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
