"use client";

/**
 * Bulk generate dialog — lets an agent apply the same template to the
 * current selection of requests from the inbox. Uses the `bulkGenerate`
 * action which fans out scheduler jobs. Per-request outcomes surface in
 * each request's Documents section.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	useAuthenticatedConvexQuery,
	useConvexActionQuery,
} from "@/integrations/convex/hooks";

interface Props {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	orgId: Id<"orgs">;
	selectedIds: Id<"requests">[];
	onCompleted?: () => void;
}

export function BulkGenerateDialog({
	open,
	onOpenChange,
	orgId,
	selectedIds,
	onCompleted,
}: Props) {
	const { t } = useTranslation();
	const [templateId, setTemplateId] = useState<Id<"documentTemplates"> | "">("");
	const [publishImmediately, setPublishImmediately] = useState(false);
	const [running, setRunning] = useState(false);

	// Org-only templates — les modèles globaux ne servent JAMAIS à générer
	// directement, uniquement comme sources de clonage dans /itemplates.
	const { data: templates } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listOrgTemplates,
		{ orgId },
	);

	const { mutateAsync: bulkGenerate } = useConvexActionQuery(
		api.functions.generatedDocuments.bulkGenerate,
	);

	async function onRun() {
		if (!templateId || selectedIds.length === 0) return;
		setRunning(true);
		try {
			const res = await bulkGenerate({
				requestIds: selectedIds,
				templateId,
				autoPublishOverride: publishImmediately || undefined,
			});
			toast.success(t("templates.bulk.scheduled", { count: res.scheduled }));
			onOpenChange(false);
			onCompleted?.();
			setTemplateId("");
		} catch (err) {
			const message = err instanceof Error ? err.message : t("templates.bulk.actionFailed");
			toast.error(message);
		} finally {
			setRunning(false);
		}
	}

	const templateOptions: ComboboxOption<string>[] = (templates ?? []).map(
		(tpl) => ({
			value: tpl._id,
			label: tpl.name.fr ?? tpl.name.en ?? t("templates.common.untitled"),
		}),
	);

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("templates.bulk.title")}
			maxHeight="70vh"
			footer={
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{t("templates.common.cancel")}
					</Button>
					<Button
						onClick={onRun}
						disabled={!templateId || running || selectedIds.length === 0}
					>
						{running ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{t("templates.bulk.submitting")}
							</>
						) : (
							<>
								<Sparkles className="mr-2 h-4 w-4" />
								{t("templates.bulk.submit", { count: selectedIds.length })}
							</>
						)}
					</Button>
				</div>
			}
		>
			<div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
				<p className="text-sm text-muted-foreground">
					{t("templates.bulk.description", { count: selectedIds.length })}
				</p>

				<div className="flex flex-col gap-2">
					<Label htmlFor="bulk-template">{t("templates.common.templateLabel")}</Label>
					<Combobox
						options={templateOptions}
						value={templateId || null}
						onValueChange={(v) => setTemplateId(v as Id<"documentTemplates">)}
						placeholder={
							templates ? t("templates.common.chooseTemplate") : t("templates.common.loading")
						}
						searchPlaceholder={t("templates.common.searchTemplate")}
						emptyText={t("templates.common.noTemplatesAvailableForOrg")}
					/>
				</div>

				<label className="flex items-center justify-between gap-3 rounded-md border p-3">
					<div>
						<div className="text-sm font-medium">
							{t("templates.bulk.publish.title")}
						</div>
						<div className="text-xs text-muted-foreground">
							{t("templates.bulk.publish.description")}
						</div>
					</div>
					<Switch
						checked={publishImmediately}
						onCheckedChange={setPublishImmediately}
					/>
				</label>
			</div>
		</BottomSheet>
	);
}
