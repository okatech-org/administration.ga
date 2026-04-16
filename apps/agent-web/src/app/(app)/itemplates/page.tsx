"use client";

/**
 * Gestion des modèles de documents au niveau de l'organisation.
 * Page rendue dans le groupe iBureau à côté de iDocument / iArchive.
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
	Archive,
	FileText,
	Files,
	Loader2,
	Plus,
	RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { motion } from "motion/react";
import { FlatCard } from "@/components/my-space/flat-card";
import { useOrg } from "@/components/org/org-provider";
import { useOrgModules } from "@/hooks/useOrgModules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

type TemplateType = "certificate" | "attestation" | "receipt" | "letter" | "custom";

const TEMPLATE_TYPES: { value: TemplateType; label: string }[] = [
	{ value: "certificate", label: "Certificat" },
	{ value: "attestation", label: "Attestation" },
	{ value: "receipt", label: "Récépissé" },
	{ value: "letter", label: "Lettre" },
	{ value: "custom", label: "Personnalisé" },
];

export default function ITemplatesPage() {
	const router = useRouter();
	const { activeOrgId } = useOrg();
	const { hasCapability } = useOrgModules();
	const showArchive = hasCapability("documents", "archive");
	const [createOpen, setCreateOpen] = useState(false);

	const { data: templates, isLoading } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listOrgTemplates,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	if (!activeOrgId) {
		return (
			<div className="p-6 text-sm text-muted-foreground">Aucune organisation active.</div>
		);
	}

	return (
		<motion.div
			initial="hidden"
			animate="visible"
			variants={{
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
			}}
			className="space-y-5 p-4 md:p-6"
		>
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Files className="h-5 w-5" />
				</div>
				<div className="flex-1">
					<h1 className="text-xl font-bold">Modèles de documents</h1>
					<p className="text-sm text-muted-foreground">
						Les modèles de ton organisation utilisés pour générer les documents officiels.
					</p>
				</div>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Créer un modèle
				</Button>
			</div>

			{/* Onglets cohérents avec iDocument / iArchive */}
			<div className="flex items-center border-b border-border/50">
				<div className="flex items-center">
					<Link
						href="/idocument"
						className="-mb-px flex items-center gap-1.5 rounded-t-lg border border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground/70 transition-all hover:border-border hover:bg-muted/60 hover:text-foreground"
					>
						<FileText className="h-3.5 w-3.5" />
						iDocument
					</Link>
					{showArchive ? (
						<Link
							href="/iarchive"
							className="-mb-px ml-1 flex items-center gap-1.5 rounded-t-lg border border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground/70 transition-all hover:border-border hover:bg-muted/60 hover:text-foreground"
						>
							<Archive className="h-3.5 w-3.5 text-violet-400" />
							iArchive
						</Link>
					) : null}
					<span className="-mb-px ml-1 flex cursor-default items-center gap-1.5 border-b-2 border-primary px-4 py-2.5 text-sm font-semibold text-primary">
						<Files className="h-3.5 w-3.5" />
						Modèles de documents
					</span>
				</div>
				<div className="ml-auto flex items-center gap-1.5 pb-0.5">
					<span className="rounded-full border border-border/20 bg-muted/40 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground/40">
						iBureau
					</span>
				</div>
			</div>

			{/* Liste des modèles */}
			<FlatCard className="p-0">
				{isLoading ? (
					<div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Chargement…
					</div>
				) : !templates || templates.length === 0 ? (
					<div className="flex flex-col items-center gap-3 p-10 text-center">
						<Files className="h-8 w-8 text-muted-foreground" />
						<div>
							<p className="font-medium">Aucun modèle pour cette organisation</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Crée un premier modèle — soit vierge, soit à partir d'un modèle existant.
							</p>
						</div>
						<Button onClick={() => setCreateOpen(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Créer un modèle
						</Button>
					</div>
				) : (
					<ul className="divide-y">
						{templates.map((t) => (
							<TemplateRow
								key={t._id}
								template={t}
								onOpen={(id) => router.push(`/itemplates/${id}`)}
							/>
						))}
					</ul>
				)}
			</FlatCard>

			{activeOrgId ? (
				<CreateTemplateSheet
					open={createOpen}
					onOpenChange={setCreateOpen}
					orgId={activeOrgId}
					onCreated={(id) => {
						setCreateOpen(false);
						router.push(`/itemplates/${id}`);
					}}
				/>
			) : null}
		</motion.div>
	);
}

function TemplateRow({
	template,
	onOpen,
}: {
	template: Doc<"documentTemplates">;
	onOpen: (id: Id<"documentTemplates">) => void;
}) {
	const title = template.name.fr ?? template.name.en ?? "(sans titre)";
	const description = template.description?.fr ?? template.description?.en;
	const { data: sourceStatus } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.getSourceUpdateStatus,
		{ templateId: template._id },
	);

	return (
		<li
			className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
			onClick={() => onOpen(template._id)}
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="font-medium">{title}</span>
					{sourceStatus ? (
						<Badge className="gap-1 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200">
							<RefreshCw className="h-3 w-3" />
							Mise à jour disponible
						</Badge>
					) : null}
				</div>
				{description ? (
					<div className="mt-0.5 text-sm text-muted-foreground">{description}</div>
				) : null}
				<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
					<span className="rounded bg-muted px-1.5 py-0.5 uppercase tracking-wide">
						{template.templateType}
					</span>
					<span>v{template.version ?? 1}</span>
					{template.updatedAt ? (
						<span>— maj {new Date(template.updatedAt).toLocaleDateString("fr-FR")}</span>
					) : null}
				</div>
			</div>
			<span className="text-sm text-muted-foreground">Ouvrir →</span>
		</li>
	);
}

// ─── Dialog de création : vierge OU depuis un modèle existant ─────────────

function CreateTemplateSheet({
	open,
	onOpenChange,
	orgId,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	orgId: Id<"orgs">;
	onCreated: (id: Id<"documentTemplates">) => void;
}) {
	const [mode, setMode] = useState<"blank" | "fromExisting">("blank");
	const [nameFr, setNameFr] = useState("");
	const [descFr, setDescFr] = useState("");
	const [templateType, setTemplateType] = useState<TemplateType>("attestation");
	const [sourceId, setSourceId] = useState<Id<"documentTemplates"> | "">("");
	const [busy, setBusy] = useState(false);

	const { data: sources } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listCloneSources,
		open && mode === "fromExisting" ? { orgId } : "skip",
	);

	const { mutateAsync: createTemplate } = useConvexMutationQuery(
		api.functions.documentTemplates.create,
	);
	const { mutateAsync: cloneTemplate } = useConvexMutationQuery(
		api.functions.documentTemplates.cloneTemplate,
	);

	async function onSubmit() {
		setBusy(true);
		try {
			if (mode === "blank") {
				if (!nameFr.trim()) {
					toast.error("Saisis un nom en français");
					return;
				}
				const id = await createTemplate({
					name: { fr: nameFr.trim() },
					description: descFr.trim() ? { fr: descFr.trim() } : undefined,
					templateType,
					content: { type: "doc", content: [{ type: "paragraph" }] },
					placeholders: [],
					orgId,
					isGlobal: false,
				});
				toast.success("Modèle créé");
				onCreated(id);
			} else {
				if (!sourceId) {
					toast.error("Sélectionne un modèle source");
					return;
				}
				const id = await cloneTemplate({
					sourceTemplateId: sourceId as Id<"documentTemplates">,
					orgId,
				});
				toast.success("Modèle cloné");
				onCreated(id);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Échec de la création");
		} finally {
			setBusy(false);
		}
	}

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title="Créer un modèle de document"
			maxHeight="85vh"
			footer={
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Annuler
					</Button>
					<Button onClick={onSubmit} disabled={busy}>
						{busy ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Création…
							</>
						) : (
							<>
								<Plus className="mr-2 h-4 w-4" />
								{mode === "blank" ? "Créer et rédiger" : "Cloner et ouvrir"}
							</>
						)}
					</Button>
				</div>
			}
		>
			<div className="flex flex-col gap-5 px-4 py-4 sm:px-5">
				{/* Choix du mode */}
				<div className="grid gap-2 md:grid-cols-2">
					<ModeCard
						active={mode === "blank"}
						title="Modèle vierge"
						description="Commencer avec une page blanche."
						onClick={() => setMode("blank")}
					/>
					<ModeCard
						active={mode === "fromExisting"}
						title="Depuis un modèle existant"
						description="Cloner un modèle global ou un autre modèle de l'organisation."
						onClick={() => setMode("fromExisting")}
					/>
				</div>

				{mode === "blank" ? (
					<div className="flex flex-col gap-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-1">
								<Label htmlFor="new-name">Nom (FR)</Label>
								<Input
									id="new-name"
									value={nameFr}
									onChange={(e) => setNameFr(e.target.value)}
									placeholder="Attestation de résidence"
									autoFocus
								/>
							</div>
							<div className="flex flex-col gap-1">
								<Label htmlFor="new-type">Type</Label>
								<Select
									value={templateType}
									onValueChange={(v) => setTemplateType(v as TemplateType)}
								>
									<SelectTrigger id="new-type">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TEMPLATE_TYPES.map((t) => (
											<SelectItem key={t.value} value={t.value}>
												{t.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<Label htmlFor="new-desc">Description (FR)</Label>
							<Textarea
								id="new-desc"
								value={descFr}
								onChange={(e) => setDescFr(e.target.value)}
								rows={2}
								placeholder="Courte description expliquant l'usage"
							/>
						</div>
					</div>
				) : (
					<div className="flex flex-col gap-2">
						<Label>Modèle source</Label>
						{!sources ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Chargement…
							</div>
						) : sources.length === 0 ? (
							<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
								Aucun modèle disponible à cloner pour ce type d'organisation.
							</div>
						) : (
							<ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
								{sources.map((s) => (
									<li key={s._id}>
										<button
											type="button"
											onClick={() => setSourceId(s._id)}
											data-selected={sourceId === s._id ? "true" : undefined}
											className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 data-[selected=true]:border-primary data-[selected=true]:bg-primary/5"
										>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<span className="truncate font-medium">
														{s.name.fr ?? s.name.en ?? "(sans titre)"}
													</span>
													{s.isGlobal ? (
														<Badge variant="outline" className="text-xs">
															Global
														</Badge>
													) : (
														<Badge variant="secondary" className="text-xs">
															Org
														</Badge>
													)}
												</div>
												{s.description?.fr ? (
													<div className="mt-0.5 text-xs text-muted-foreground">
														{s.description.fr}
													</div>
												) : null}
												<div className="mt-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
													{s.templateType} — v{s.version ?? 1}
												</div>
											</div>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				)}
			</div>
		</BottomSheet>
	);
}

function ModeCard({
	active,
	title,
	description,
	onClick,
}: {
	active: boolean;
	title: string;
	description: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			data-active={active ? "true" : undefined}
			className="flex flex-col gap-1 rounded-md border border-border bg-background p-4 text-left transition-all hover:border-primary/40 data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:ring-2 data-[active=true]:ring-primary/15"
		>
			<div className="font-medium">{title}</div>
			<div className="text-xs text-muted-foreground">{description}</div>
		</button>
	);
}
