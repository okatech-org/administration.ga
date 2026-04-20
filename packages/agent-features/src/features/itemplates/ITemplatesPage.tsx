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
import { Link, useRouter } from "@workspace/routing";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BottomSheet } from "@workspace/ui/components/bottom-sheet";
import { motion } from "motion/react";
import { FlatCard } from "../../components/my-space/flat-card";
import { useOrg } from "../../shell/org-provider";
import { useOrgModules } from "../../hooks/useOrgModules";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
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
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";

type TemplateType =
	| "certificate"
	| "attestation"
	| "receipt"
	| "letter"
	| "custom";

const TEMPLATE_TYPES: TemplateType[] = [
	"certificate",
	"attestation",
	"receipt",
	"letter",
	"custom",
];

export default function ITemplatesPage() {
	const { t, i18n } = useTranslation();
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
			<div className="p-6 text-sm text-muted-foreground">
				{t("templates.list.noOrg")}
			</div>
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
					<h1 className="text-xl font-bold">{t("templates.list.title")}</h1>
					<p className="text-sm text-muted-foreground">
						{t("templates.list.subtitle")}
					</p>
				</div>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					{t("templates.list.createButton")}
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
						{t("templates.list.title")}
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
						{t("templates.common.loading")}
					</div>
				) : !templates || templates.length === 0 ? (
					<div className="flex flex-col items-center gap-3 p-10 text-center">
						<Files className="h-8 w-8 text-muted-foreground" />
						<div>
							<p className="font-medium">{t("templates.list.empty.title")}</p>
							<p className="mt-1 text-sm text-muted-foreground">
								{t("templates.list.empty.description")}
							</p>
						</div>
						<Button onClick={() => setCreateOpen(true)}>
							<Plus className="mr-2 h-4 w-4" />
							{t("templates.list.createButton")}
						</Button>
					</div>
				) : (
					<ul className="divide-y">
						{templates.map((tpl) => (
							<TemplateRow
								key={tpl._id}
								template={tpl}
								onOpen={(id) => router.push(`/itemplates/${id}`)}
								locale={i18n.language}
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
	locale,
}: {
	template: Doc<"documentTemplates">;
	onOpen: (id: Id<"documentTemplates">) => void;
	locale: string;
}) {
	const { t } = useTranslation();
	const title =
		template.name.fr ?? template.name.en ?? t("templates.common.untitled");
	const description = template.description?.fr ?? template.description?.en;
	const dateLocale = locale.startsWith("fr") ? "fr-FR" : "en-US";
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
							{t("templates.list.row.updateAvailable")}
						</Badge>
					) : null}
				</div>
				{description ? (
					<div className="mt-0.5 text-sm text-muted-foreground">
						{description}
					</div>
				) : null}
				<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
					<span className="rounded bg-muted px-1.5 py-0.5 uppercase tracking-wide">
						{t(`templates.type.${template.templateType}`, template.templateType)}
					</span>
					<span>v{template.version ?? 1}</span>
					{template.updatedAt ? (
						<span>
							—{" "}
							{t("templates.list.row.updatedOn", {
								date: new Date(template.updatedAt).toLocaleDateString(
									dateLocale,
								),
							})}
						</span>
					) : null}
				</div>
			</div>
			<span className="text-sm text-muted-foreground">
				{t("templates.list.row.open")}
			</span>
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
	const { t } = useTranslation();
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
					toast.error(t("templates.create.errors.nameRequired"));
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
				toast.success(t("templates.create.toast.created"));
				onCreated(id);
			} else {
				if (!sourceId) {
					toast.error(t("templates.create.errors.selectSource"));
					return;
				}
				const id = await cloneTemplate({
					sourceTemplateId: sourceId as Id<"documentTemplates">,
					orgId,
				});
				toast.success(t("templates.create.toast.cloned"));
				onCreated(id);
			}
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: t("templates.create.errors.createFailed"),
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("templates.create.sheetTitle")}
			maxHeight="85vh"
			footer={
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("templates.common.cancel")}
					</Button>
					<Button onClick={onSubmit} disabled={busy}>
						{busy ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{t("templates.create.creating")}
							</>
						) : (
							<>
								<Plus className="mr-2 h-4 w-4" />
								{mode === "blank"
									? t("templates.create.submitBlank")
									: t("templates.create.submitClone")}
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
						title={t("templates.create.modes.blank.title")}
						description={t("templates.create.modes.blank.description")}
						onClick={() => setMode("blank")}
					/>
					<ModeCard
						active={mode === "fromExisting"}
						title={t("templates.create.modes.fromExisting.title")}
						description={t("templates.create.modes.fromExisting.description")}
						onClick={() => setMode("fromExisting")}
					/>
				</div>

				{mode === "blank" ? (
					<div className="flex flex-col gap-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-1">
								<Label htmlFor="new-name">
									{t("templates.create.fields.nameFr")}
								</Label>
								<Input
									id="new-name"
									value={nameFr}
									onChange={(e) => setNameFr(e.target.value)}
									placeholder={t("templates.create.fields.namePlaceholder")}
									autoFocus
								/>
							</div>
							<div className="flex flex-col gap-1">
								<Label htmlFor="new-type">
									{t("templates.create.fields.type")}
								</Label>
								<Select
									value={templateType}
									onValueChange={(v) => setTemplateType(v as TemplateType)}
								>
									<SelectTrigger id="new-type">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TEMPLATE_TYPES.map((tp) => (
											<SelectItem key={tp} value={tp}>
												{t(`templates.type.${tp}`)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<Label htmlFor="new-desc">
								{t("templates.create.fields.descriptionFr")}
							</Label>
							<Textarea
								id="new-desc"
								value={descFr}
								onChange={(e) => setDescFr(e.target.value)}
								rows={2}
								placeholder={t("templates.create.fields.descriptionPlaceholder")}
							/>
						</div>
					</div>
				) : (
					<div className="flex flex-col gap-2">
						<Label>{t("templates.create.fields.sourceTemplate")}</Label>
						{!sources ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								{t("templates.common.loading")}
							</div>
						) : sources.length === 0 ? (
							<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
								{t("templates.create.noSourcesForOrgType")}
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
														{s.name.fr ??
															s.name.en ??
															t("templates.common.untitled")}
													</span>
													{s.isGlobal ? (
														<Badge variant="outline" className="text-xs">
															{t("templates.create.sourceBadge.global")}
														</Badge>
													) : (
														<Badge variant="secondary" className="text-xs">
															{t("templates.create.sourceBadge.org")}
														</Badge>
													)}
												</div>
												{s.description?.fr ? (
													<div className="mt-0.5 text-xs text-muted-foreground">
														{s.description.fr}
													</div>
												) : null}
												<div className="mt-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
													{t(`templates.type.${s.templateType}`, s.templateType)}{" "}
													— v{s.version ?? 1}
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
