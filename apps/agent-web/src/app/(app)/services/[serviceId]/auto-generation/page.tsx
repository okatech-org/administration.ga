"use client";

/**
 * Auto-generation rules editor for a given OrgService.
 *
 * Lets an authorized agent (permission `documents.manage_templates`) declare
 * which templates should be produced automatically when:
 *  - a citizen submits a request for this service (`on_submission`), or
 *  - an agent transitions a request from one status to another
 *    (`on_status_transition`).
 *
 * The whole rule set is edited as an array and saved atomically through
 * `services.updateAutoGenerationRules`.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RequestStatus } from "@convex/lib/constants";
import {
	FileText,
	Plus,
	Save,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FlatCard } from "@/components/my-space/flat-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useOrg } from "@/components/org/org-provider";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

type Trigger = "on_submission" | "on_status_transition";

interface RuleDraft {
	trigger: Trigger;
	fromStatus?: string;
	toStatus?: string;
	templateId: Id<"documentTemplates"> | "";
	autoSign: boolean;
	autoPublish: boolean;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
	{ value: RequestStatus.Draft, label: "Brouillon" },
	{ value: RequestStatus.Submitted, label: "Soumise" },
	{ value: RequestStatus.Pending, label: "En attente" },
	{ value: RequestStatus.UnderReview, label: "En instruction" },
	{ value: RequestStatus.InProduction, label: "En production" },
	{ value: RequestStatus.Validated, label: "Validée" },
	{ value: RequestStatus.AppointmentScheduled, label: "RDV planifié" },
	{ value: RequestStatus.ReadyForPickup, label: "Prête au retrait" },
	{ value: RequestStatus.Completed, label: "Terminée" },
	{ value: RequestStatus.Rejected, label: "Rejetée" },
	{ value: RequestStatus.Cancelled, label: "Annulée" },
];

export default function AutoGenerationRulesPage() {
	const params = useParams();
	const { activeOrgId } = useOrg();
	const orgServiceId = params.serviceId as Id<"orgServices">;

	const { data: orgService, isLoading: loadingService } = useAuthenticatedConvexQuery(
		api.functions.services.getOrgServiceById,
		{ orgServiceId },
	);

	// Org-only templates : les règles auto-gen ne référencent que les modèles
	// de l'organisation, jamais des modèles globaux directement.
	const { data: templates, isLoading: loadingTemplates } = useAuthenticatedConvexQuery(
		api.functions.documentTemplates.listOrgTemplates,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const { mutateAsync: saveRules } = useConvexMutationQuery(
		api.functions.services.updateAutoGenerationRules,
	);

	const [rules, setRules] = useState<RuleDraft[] | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (orgService && rules === null) {
			setRules(
				((orgService.autoGenerationRules ?? []) as unknown as RuleDraft[]).map(
					(r) => ({ ...r }),
				),
			);
		}
	}, [orgService, rules]);

	if (loadingService) {
		return <div className="p-6 text-sm text-muted-foreground">Chargement du service…</div>;
	}
	if (!orgService) {
		return <div className="p-6 text-sm text-destructive">Service introuvable.</div>;
	}

	const draft = rules ?? [];

	function patch(index: number, changes: Partial<RuleDraft>) {
		setRules((current) => {
			const base = current ?? [];
			return base.map((r, i) => (i === index ? { ...r, ...changes } : r));
		});
	}

	function addRule() {
		setRules((current) => [
			...(current ?? []),
			{
				trigger: "on_submission",
				templateId: "",
				autoSign: false,
				autoPublish: true,
			},
		]);
	}

	function removeRule(index: number) {
		setRules((current) => (current ?? []).filter((_, i) => i !== index));
	}

	async function save() {
		// Validate before sending.
		for (const [i, rule] of draft.entries()) {
			if (!rule.templateId) {
				toast.error(`Règle ${i + 1} : modèle manquant`);
				return;
			}
			if (rule.trigger === "on_status_transition" && !rule.toStatus) {
				toast.error(`Règle ${i + 1} : statut cible manquant`);
				return;
			}
		}
		setSaving(true);
		try {
			await saveRules({
				orgServiceId,
				rules: draft.map((r) => ({
					trigger: r.trigger,
					fromStatus: r.fromStatus as never,
					toStatus: r.toStatus as never,
					templateId: r.templateId as Id<"documentTemplates">,
					autoSign: r.autoSign,
					autoPublish: r.autoPublish,
				})),
			});
			toast.success("Règles enregistrées");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Échec de l'enregistrement";
			toast.error(message);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<header className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Sparkles className="h-5 w-5" />
				</div>
				<div className="flex-1">
					<h1 className="text-xl font-bold">Génération automatique</h1>
					<p className="text-sm text-muted-foreground">
						Configure les modèles à produire automatiquement pour ce service.
					</p>
				</div>
				<Button onClick={save} disabled={saving}>
					<Save className="mr-2 h-4 w-4" />
					{saving ? "Enregistrement…" : "Enregistrer"}
				</Button>
			</header>

			<FlatCard className="p-4 md:p-6">
				{draft.length === 0 ? (
					<div className="flex flex-col items-center gap-3 py-8 text-center">
						<FileText className="h-8 w-8 text-muted-foreground" />
						<div>
							<p className="font-medium">Aucune règle configurée</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Ajoute une règle pour déclencher une génération à la soumission ou sur
								transition de statut.
							</p>
						</div>
						<Button onClick={addRule}>
							<Plus className="mr-2 h-4 w-4" />
							Ajouter une règle
						</Button>
					</div>
				) : (
					<div className="flex flex-col gap-4">
						{draft.map((rule, index) => (
							<RuleEditor
								key={index}
								rule={rule}
								templates={(templates ?? []) as Array<{ _id: Id<"documentTemplates">; name: Record<string, string> }>}
								templatesLoading={loadingTemplates}
								onChange={(changes) => patch(index, changes)}
								onRemove={() => removeRule(index)}
								index={index + 1}
							/>
						))}
						<Button variant="outline" onClick={addRule}>
							<Plus className="mr-2 h-4 w-4" />
							Ajouter une règle
						</Button>
					</div>
				)}
			</FlatCard>
		</div>
	);
}

function RuleEditor({
	rule,
	index,
	templates,
	templatesLoading,
	onChange,
	onRemove,
}: {
	rule: RuleDraft;
	index: number;
	templates: Array<{ _id: Id<"documentTemplates">; name: Record<string, string> }>;
	templatesLoading: boolean;
	onChange: (changes: Partial<RuleDraft>) => void;
	onRemove: () => void;
}) {
	return (
		<div className="rounded-xl border bg-background p-4">
			<header className="mb-3 flex items-center justify-between gap-2">
				<span className="text-sm font-semibold">Règle {index}</span>
				<Button size="icon" variant="ghost" onClick={onRemove} aria-label="Supprimer la règle">
					<Trash2 className="h-4 w-4 text-muted-foreground" />
				</Button>
			</header>

			<div className="grid gap-3 md:grid-cols-2">
				<div className="flex flex-col gap-1">
					<Label>Déclencheur</Label>
					<Select
						value={rule.trigger}
						onValueChange={(v) =>
							onChange({
								trigger: v as Trigger,
								// Reset status fields when trigger flips
								...(v === "on_submission" ? { fromStatus: undefined, toStatus: undefined } : {}),
							})
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="on_submission">À la soumission citoyen</SelectItem>
							<SelectItem value="on_status_transition">Sur transition de statut</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1">
					<Label>Modèle</Label>
					<Select
						value={rule.templateId}
						onValueChange={(v) => onChange({ templateId: v as Id<"documentTemplates"> })}
					>
						<SelectTrigger>
							<SelectValue placeholder={templatesLoading ? "Chargement…" : "Choisir un modèle"} />
						</SelectTrigger>
						<SelectContent>
							{templates.map((t) => (
								<SelectItem key={t._id} value={t._id}>
									{t.name.fr ?? t.name.en ?? "(sans titre)"}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{rule.trigger === "on_status_transition" ? (
					<>
						<div className="flex flex-col gap-1">
							<Label>Depuis le statut (optionnel)</Label>
							<Select
								value={rule.fromStatus ?? ""}
								onValueChange={(v) => onChange({ fromStatus: v || undefined })}
							>
								<SelectTrigger>
									<SelectValue placeholder="Tout statut" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">Tout statut</SelectItem>
									{STATUS_OPTIONS.map((s) => (
										<SelectItem key={s.value} value={s.value}>
											{s.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1">
							<Label>Vers le statut</Label>
							<Select
								value={rule.toStatus ?? ""}
								onValueChange={(v) => onChange({ toStatus: v || undefined })}
							>
								<SelectTrigger>
									<SelectValue placeholder="Statut cible (requis)" />
								</SelectTrigger>
								<SelectContent>
									{STATUS_OPTIONS.map((s) => (
										<SelectItem key={s.value} value={s.value}>
											{s.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</>
				) : null}
			</div>

			<div className="mt-4 grid gap-3 md:grid-cols-2">
				<label className="flex items-center justify-between gap-3 rounded-md border p-3">
					<div>
						<div className="text-sm font-medium">Signer automatiquement</div>
						<div className="text-xs text-muted-foreground">
							Apposer la signature de l'agent à la génération (Phase 3).
						</div>
					</div>
					<Switch
						checked={rule.autoSign}
						onCheckedChange={(checked) => onChange({ autoSign: checked })}
					/>
				</label>
				<label className="flex items-center justify-between gap-3 rounded-md border p-3">
					<div>
						<div className="text-sm font-medium">Publier au citoyen</div>
						<div className="text-xs text-muted-foreground">
							Rendre le document visible immédiatement après génération.
						</div>
					</div>
					<Switch
						checked={rule.autoPublish}
						onCheckedChange={(checked) => onChange({ autoPublish: checked })}
					/>
				</label>
			</div>
		</div>
	);
}
