"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { FolderOpen, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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

type CaseStatus = "open" | "monitoring" | "closed" | "archived";
type CasePriority = "low" | "medium" | "high" | "critical";
type CaseClassification = "internal" | "restricted" | "secret" | "top_secret";

const STATUS_LABELS: Record<CaseStatus, string> = {
	open: "Ouvert",
	monitoring: "Surveillance",
	closed: "Clos",
	archived: "Archivé",
};

const PRIORITY_LABELS: Record<CasePriority, string> = {
	low: "Faible",
	medium: "Moyen",
	high: "Élevé",
	critical: "Critique",
};

const PRIORITY_CLASSES: Record<CasePriority, string> = {
	low: "bg-muted/50 text-muted-foreground border-border/50",
	medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
	high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
	critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const CLASSIFICATION_LABELS: Record<CaseClassification, string> = {
	internal: "Interne",
	restricted: "Restreint",
	secret: "Secret",
	top_secret: "Très Secret",
};

export default function IntelligenceCasesPage() {
	const { activeOrgId } = useOrg();
	const [statusFilter, setStatusFilter] = useState<CaseStatus | "all">("all");

	const { data: cases, isLoading } = useAuthenticatedConvexQuery(
		api.functions.intelligenceCases.list,
		activeOrgId
			? {
					orgId: activeOrgId,
					...(statusFilter !== "all" ? { status: statusFilter } : {}),
				}
			: "skip",
	);

	if (!activeOrgId) return null;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
			<PageHeader
				icon={<FolderOpen className="size-5" />}
				title="Dossiers d'investigation"
				subtitle="Regroupez profils, notes et liens autour d'un fil rouge."
				actions={<CreateCaseButton orgId={activeOrgId} />}
			/>

			<div className="flex flex-wrap gap-2">
				{(["all", "open", "monitoring", "closed", "archived"] as const).map(
					(s) => (
						<Button
							key={s}
							type="button"
							variant={s === statusFilter ? "default" : "outline"}
							size="sm"
							onClick={() => setStatusFilter(s)}
						>
							{s === "all" ? "Tous" : STATUS_LABELS[s]}
						</Button>
					),
				)}
			</div>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			) : !cases || cases.length === 0 ? (
				<FlatCard className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
					<FolderOpen className="size-8 opacity-50" />
					<div>Aucun dossier — créez-en un pour commencer.</div>
				</FlatCard>
			) : (
				<div className="flex flex-col gap-3">
					{cases.map((c) => (
						<FlatCard key={c._id} className="flex flex-col gap-2 p-4">
							<div className="flex items-start justify-between gap-3">
								<div className="flex flex-col gap-1">
									<div className="flex flex-wrap items-center gap-2">
										<Badge
											variant="outline"
											className={cn("text-[10px]", PRIORITY_CLASSES[c.priority])}
										>
											{PRIORITY_LABELS[c.priority]}
										</Badge>
										<Badge variant="outline" className="text-[10px]">
											{STATUS_LABELS[c.status]}
										</Badge>
										<Badge variant="outline" className="text-[10px]">
											{CLASSIFICATION_LABELS[c.classification]}
										</Badge>
										<span className="text-xs text-muted-foreground">
											{formatDistanceToNow(c.openedAt, {
												addSuffix: true,
												locale: fr,
											})}
										</span>
									</div>
									<div className="font-medium text-sm leading-tight">
										{c.title}
									</div>
									{c.summary && (
										<div className="text-xs text-muted-foreground">
											{c.summary}
										</div>
									)}
								</div>
							</div>
						</FlatCard>
					))}
				</div>
			)}
		</div>
	);
}

function CreateCaseButton({ orgId }: { orgId: Id<"orgs"> }) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [summary, setSummary] = useState("");
	const [priority, setPriority] = useState<CasePriority>("medium");
	const [classification, setClassification] =
		useState<CaseClassification>("internal");
	const [busy, setBusy] = useState(false);

	const { mutateAsync: createCase } = useConvexMutationQuery(
		api.functions.intelligenceCases.create,
	);

	const handleCreate = async () => {
		if (!title.trim()) return;
		setBusy(true);
		try {
			await createCase({
				orgId,
				title: title.trim(),
				summary: summary.trim() || undefined,
				priority,
				classification,
			});
			setOpen(false);
			setTitle("");
			setSummary("");
			setPriority("medium");
			setClassification("internal");
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm">
					<Plus className="size-4" />
					Nouveau dossier
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Ouvrir un dossier d'investigation</DialogTitle>
					<DialogDescription>
						Le dossier servira de fil rouge — entités, notes et liens y seront
						rattachés.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="case-title">Titre</Label>
						<Input
							id="case-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Ex: Cellule technologique Paris"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="case-summary">Résumé</Label>
						<Textarea
							id="case-summary"
							rows={3}
							value={summary}
							onChange={(e) => setSummary(e.target.value)}
							placeholder="Contexte initial, objectif, hypothèses..."
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label>Priorité</Label>
							<Select
								value={priority}
								onValueChange={(v) => setPriority(v as CasePriority)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(PRIORITY_LABELS).map(([k, label]) => (
										<SelectItem key={k} value={k}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>Classification</Label>
							<Select
								value={classification}
								onValueChange={(v) =>
									setClassification(v as CaseClassification)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(CLASSIFICATION_LABELS).map(([k, label]) => (
										<SelectItem key={k} value={k}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => setOpen(false)}
						disabled={busy}
					>
						Annuler
					</Button>
					<Button onClick={handleCreate} disabled={!title.trim() || busy}>
						{busy && <Loader2 className="size-4 animate-spin" />}
						Créer le dossier
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
