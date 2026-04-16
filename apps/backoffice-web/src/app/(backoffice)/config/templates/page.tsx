"use client";

/**
 * Super-admin library of GLOBAL document templates.
 *
 * Org-specific templates live in the agent workspace at `/settings/templates`.
 * This page drives the biblioteca from which agents clone templates.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { useConvexQuery } from "@/integrations/convex/hooks";

export default function GlobalTemplatesPage() {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const { data: templates, isLoading } = useConvexQuery(
		api.functions.documentTemplates.listGlobal,
		{},
	);

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title={t("templates.global.page.title")}
				subtitle={t("templates.global.page.subtitle")}
				icon={<FileText />}
				actions={
					<Button onClick={() => router.push("/config/templates/new")}>
						<Plus className="mr-2 h-4 w-4" />
						{t("templates.global.page.newTemplate")}
					</Button>
				}
			/>

			<FlatCard>
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
									template={tpl}
									onOpen={(id) => router.push(`/config/templates/${id}`)}
									locale={i18n.language}
								/>
							</li>
						))}
					</ul>
				)}
			</FlatCard>
		</div>
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
