"use client";

/**
 * Super-admin library of GLOBAL document templates.
 *
 * Quatre onglets :
 *  - Modèles : les `documentTemplates` (contenu Tiptap + composition)
 *  - Entêtes : briques `templateHeaderFooterBlocks` (logo, entête, pied)
 *  - Typographies : briques `templateTypographyBlocks` (police, tailles, sauts)
 *  - Styles rédactionnels : briques `templateVoiceBlocks` (métier IA uniquement)
 *
 * Org-specific templates live in the agent workspace at `/settings/templates`.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	FileText,
	LayoutTemplate,
	MessageSquareQuote,
	Palette,
	Plus,
	Type,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConvexQuery } from "@/integrations/convex/hooks";

type TemplateTab = "templates" | "header-footer" | "typography" | "voice";

export default function GlobalTemplatesPage() {
	const { t } = useTranslation();
	const router = useRouter();

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title={t("templates.global.page.title")}
				subtitle={t("templates.global.page.subtitle")}
				icon={<LayoutTemplate />}
			/>

			<Tabs defaultValue="templates" className="flex flex-col gap-4">
				<TabsList className="w-fit shrink-0">
					<TabsTrigger value="templates" className="gap-2">
						<FileText className="h-4 w-4" />
						{t("templates.global.tabs.templates")}
					</TabsTrigger>
					<TabsTrigger value="header-footer" className="gap-2">
						<Palette className="h-4 w-4" />
						{t("templates.global.tabs.headerFooter")}
					</TabsTrigger>
					<TabsTrigger value="typography" className="gap-2">
						<Type className="h-4 w-4" />
						{t("templates.global.tabs.typography")}
					</TabsTrigger>
					<TabsTrigger value="voice" className="gap-2">
						<MessageSquareQuote className="h-4 w-4" />
						{t("templates.global.tabs.voice")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="templates" className="mt-0 border-none outline-none">
					<TemplatesTab router={router} />
				</TabsContent>
				<TabsContent value="header-footer" className="mt-0 border-none outline-none">
					<HeaderFooterTab router={router} />
				</TabsContent>
				<TabsContent value="typography" className="mt-0 border-none outline-none">
					<TypographyTab router={router} />
				</TabsContent>
				<TabsContent value="voice" className="mt-0 border-none outline-none">
					<VoiceTab router={router} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

// ============================================================================
// Onglet 1 — Modèles
// ============================================================================

function TemplatesTab({ router }: { router: ReturnType<typeof useRouter> }) {
	const { t, i18n } = useTranslation();
	const { data: templates, isLoading } = useConvexQuery(
		api.functions.documentTemplates.listGlobal,
		{},
	);

	return (
		<FlatCard>
			<div className="flex items-center justify-between border-b px-5 py-3">
				<p className="text-sm text-muted-foreground">
					{t("templates.global.page.subtitle")}
				</p>
				<Button onClick={() => router.push("/config/templates/new")}>
					<Plus className="mr-2 h-4 w-4" />
					{t("templates.global.page.newTemplate")}
				</Button>
			</div>

			{isLoading ? (
				<div className="p-6 text-sm text-muted-foreground">
					{t("templates.global.page.loading")}
				</div>
			) : !templates || templates.length === 0 ? (
				<div className="flex flex-col items-center gap-2 p-10 text-center">
					<FileText className="h-10 w-10 text-muted-foreground" />
					<p className="font-medium">{t("templates.global.page.empty.title")}</p>
					<p className="text-sm text-muted-foreground">
						{t("templates.global.page.empty.description")}
					</p>
					<Button
						className="mt-4"
						onClick={() => router.push("/config/templates/new")}
					>
						<Plus className="mr-2 h-4 w-4" />
						{t("templates.global.page.empty.createButton")}
					</Button>
				</div>
			) : (
				<ul className="divide-y">
					{templates.map((tpl) => (
						<li key={tpl._id}>
							<TemplateRow
								template={tpl as TemplateSummary}
								onOpen={(id) => router.push(`/config/templates/${id}`)}
								locale={i18n.language}
							/>
						</li>
					))}
				</ul>
			)}
		</FlatCard>
	);
}

interface TemplateSummary {
	_id: Id<"documentTemplates">;
	name: Record<string, string>;
	description?: Record<string, string>;
	templateType: string;
	version?: number;
	isActive: boolean;
	updatedAt?: number;
}

function TemplateRow({
	template,
	onOpen,
	locale,
}: {
	template: TemplateSummary;
	onOpen: (id: Id<"documentTemplates">) => void;
	locale: string;
}) {
	const { t } = useTranslation();
	const title = template.name.fr ?? template.name.en ?? t("templates.common.untitled");
	const desc = template.description?.fr ?? template.description?.en;
	const dateLocale = locale.startsWith("fr") ? "fr-FR" : "en-US";
	return (
		<button
			type="button"
			onClick={() => onOpen(template._id)}
			className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/40"
		>
			<div className="flex-1">
				<div className="font-medium">{title}</div>
				{desc ? (
					<div className="mt-0.5 text-sm text-muted-foreground">{desc}</div>
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
								date: new Date(template.updatedAt).toLocaleDateString(dateLocale),
							})}
						</span>
					) : null}
				</div>
			</div>
			<span className="text-sm text-muted-foreground">{t("templates.list.row.open")}</span>
		</button>
	);
}

// ============================================================================
// Onglet 2 — Entêtes & Pieds
// ============================================================================

function HeaderFooterTab({ router }: { router: ReturnType<typeof useRouter> }) {
	const { t } = useTranslation();
	const { data: blocks, isLoading } = useConvexQuery(
		api.functions.templateHeaderFooterBlocks.listGlobal,
		{},
	);

	return (
		<FlatCard>
			<div className="flex items-center justify-between border-b px-5 py-3">
				<p className="text-sm text-muted-foreground">
					{t("templates.global.headerFooter.subtitle")}
				</p>
				<Button
					onClick={() =>
						router.push("/config/templates/header-footer-blocks/new")
					}
				>
					<Plus className="mr-2 h-4 w-4" />
					{t("templates.global.headerFooter.new")}
				</Button>
			</div>

			{isLoading ? (
				<div className="p-6 text-sm text-muted-foreground">
					{t("templates.global.page.loading")}
				</div>
			) : !blocks || blocks.length === 0 ? (
				<EmptyBlockState
					icon={<Palette className="h-10 w-10 text-muted-foreground" />}
					title={t("templates.global.headerFooter.empty.title")}
					description={t("templates.global.headerFooter.empty.description")}
					onCreate={() =>
						router.push("/config/templates/header-footer-blocks/new")
					}
					createLabel={t("templates.global.headerFooter.new")}
				/>
			) : (
				<ul className="divide-y">
					{blocks.map((b) => (
						<li key={b._id}>
							<BlockRow
								block={b}
								onOpen={(id) =>
									router.push(`/config/templates/header-footer-blocks/${id}`)
								}
							/>
						</li>
					))}
				</ul>
			)}
		</FlatCard>
	);
}

// ============================================================================
// Onglet 3 — Typographies
// ============================================================================

function TypographyTab({ router }: { router: ReturnType<typeof useRouter> }) {
	const { t } = useTranslation();
	const { data: blocks, isLoading } = useConvexQuery(
		api.functions.templateTypographyBlocks.listGlobal,
		{},
	);

	return (
		<FlatCard>
			<div className="flex items-center justify-between border-b px-5 py-3">
				<p className="text-sm text-muted-foreground">
					{t("templates.global.typography.subtitle")}
				</p>
				<Button
					onClick={() =>
						router.push("/config/templates/typography-blocks/new")
					}
				>
					<Plus className="mr-2 h-4 w-4" />
					{t("templates.global.typography.new")}
				</Button>
			</div>

			{isLoading ? (
				<div className="p-6 text-sm text-muted-foreground">
					{t("templates.global.page.loading")}
				</div>
			) : !blocks || blocks.length === 0 ? (
				<EmptyBlockState
					icon={<Type className="h-10 w-10 text-muted-foreground" />}
					title={t("templates.global.typography.empty.title")}
					description={t("templates.global.typography.empty.description")}
					onCreate={() => router.push("/config/templates/typography-blocks/new")}
					createLabel={t("templates.global.typography.new")}
				/>
			) : (
				<ul className="divide-y">
					{blocks.map((b) => (
						<li key={b._id}>
							<BlockRow
								block={b}
								onOpen={(id) =>
									router.push(`/config/templates/typography-blocks/${id}`)
								}
								extraMeta={`${b.fontFamily} · ${b.fontSizeBase}pt`}
							/>
						</li>
					))}
				</ul>
			)}
		</FlatCard>
	);
}

// ============================================================================
// Onglet 4 — Styles rédactionnels (voix IA)
// ============================================================================

function VoiceTab({ router }: { router: ReturnType<typeof useRouter> }) {
	const { t } = useTranslation();
	const { data: blocks, isLoading } = useConvexQuery(
		api.functions.templateVoiceBlocks.listGlobal,
		{},
	);

	return (
		<FlatCard>
			<div className="flex items-center justify-between border-b px-5 py-3">
				<p className="text-sm text-muted-foreground">
					{t("templates.global.voice.subtitle")}
				</p>
				<Button onClick={() => router.push("/config/templates/voice-blocks/new")}>
					<Plus className="mr-2 h-4 w-4" />
					{t("templates.global.voice.new")}
				</Button>
			</div>

			{isLoading ? (
				<div className="p-6 text-sm text-muted-foreground">
					{t("templates.global.page.loading")}
				</div>
			) : !blocks || blocks.length === 0 ? (
				<EmptyBlockState
					icon={<MessageSquareQuote className="h-10 w-10 text-muted-foreground" />}
					title={t("templates.global.voice.empty.title")}
					description={t("templates.global.voice.empty.description")}
					onCreate={() => router.push("/config/templates/voice-blocks/new")}
					createLabel={t("templates.global.voice.new")}
				/>
			) : (
				<ul className="divide-y">
					{blocks.map((b) => (
						<li key={b._id}>
							<BlockRow
								block={b}
								onOpen={(id) =>
									router.push(`/config/templates/voice-blocks/${id}`)
								}
								extraMeta={`${b.tone} · ${b.register}`}
							/>
						</li>
					))}
				</ul>
			)}
		</FlatCard>
	);
}

// ============================================================================
// Lignes communes et état vide
// ============================================================================

interface BlockLike {
	_id: string;
	name: Record<string, string>;
	description?: Record<string, string>;
	isDefault?: boolean;
	version?: number;
	updatedAt?: number;
}

function BlockRow({
	block,
	onOpen,
	extraMeta,
}: {
	block: BlockLike;
	onOpen: (id: string) => void;
	extraMeta?: string;
}) {
	const { t } = useTranslation();
	const title = block.name.fr ?? block.name.en ?? t("templates.common.untitled");
	const desc = block.description?.fr ?? block.description?.en;
	return (
		<button
			type="button"
			onClick={() => onOpen(block._id)}
			className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/40"
		>
			<div className="flex-1">
				<div className="flex items-center gap-2">
					<span className="font-medium">{title}</span>
					{block.isDefault ? (
						<span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
							{t("templates.global.blocks.defaultBadge")}
						</span>
					) : null}
				</div>
				{desc ? (
					<div className="mt-0.5 text-sm text-muted-foreground">{desc}</div>
				) : null}
				<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
					{extraMeta ? (
						<span className="rounded bg-muted px-1.5 py-0.5">{extraMeta}</span>
					) : null}
					<span>v{block.version ?? 1}</span>
				</div>
			</div>
			<span className="text-sm text-muted-foreground">{t("templates.list.row.open")}</span>
		</button>
	);
}

function EmptyBlockState({
	icon,
	title,
	description,
	onCreate,
	createLabel,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	onCreate: () => void;
	createLabel: string;
}) {
	return (
		<div className="flex flex-col items-center gap-2 p-10 text-center">
			{icon}
			<p className="font-medium">{title}</p>
			<p className="text-sm text-muted-foreground">{description}</p>
			<Button className="mt-4" onClick={onCreate}>
				<Plus className="mr-2 h-4 w-4" />
				{createLabel}
			</Button>
		</div>
	);
}
