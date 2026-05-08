"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Doc } from "@convex/_generated/dataModel";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Building2, Globe, Layers, Plus, Trash2 } from "lucide-react";
import { useCurrentAdminRole } from "@/hooks/use-current-admin-role";
import { ORGANIZATION_TEMPLATES } from "@convex/lib/roles";
import { MODULE_REGISTRY } from "@convex/lib/moduleCodes";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { ContinentTabs } from "@/components/shared/ContinentTabs";
import { RepsGrid } from "@/components/admin/reps-grid";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { RepsTypesTemplatesTab } from "@/components/admin/reps-types-templates-tab";
import { RepsModuleMatrixTab } from "@/components/admin/reps-module-matrix-tab";


export default function RepresentationsPage() {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "fr" ? "fr" : "en";

	// ── Shared state across tabs ──
	const [editingOrgId, setEditingOrgId] = useState<Id<"orgs"> | null>(null);
	const [selectedOrgType, setSelectedOrgType] = useState<string | null>(null);
	const [pendingModuleChanges, setPendingModuleChanges] = useState<
		Map<string, boolean>
	>(new Map());

	const { isSuperAdmin } = useCurrentAdminRole();

	// ── Shared query ──
	const {
		data: orgs,
		isPending,
		error,
	} = useAuthenticatedConvexQuery(api.functions.admin.listOrgs, {});

	// Corbeille — uniquement chargée pour les super-admins quand la fonction le supporte.
	const { data: trashedOrgs } = useAuthenticatedConvexQuery(
		api.functions.admin.listOrgs,
		isSuperAdmin ? { mode: "trash" } : "skip",
	);

	// ── Mutations for matrix tab ──
	const { mutateAsync: updateOrgModules, isPending: isSavingModules } =
		useConvexMutationQuery(api.functions.roleConfig.updateOrgModules);

	// ── Derived data ──
	const editingOrg = useMemo(() => {
		if (!editingOrgId || !orgs) return null;
		return (orgs as any[]).find((o) => o._id === editingOrgId) ?? null;
	}, [editingOrgId, orgs]);

	const templates = useMemo(
		() =>
			ORGANIZATION_TEMPLATES.filter(
				(t) => t.type !== "third_party" && t.type !== "custom",
			),
		[],
	);

	// ── Module matrix save handler ──
	const handleSaveModules = async () => {
		if (!editingOrgId || pendingModuleChanges.size === 0) return;
		const orgModules = new Set<string>(
			(editingOrg?.modules as string[]) ?? [],
		);
		for (const [code, enabled] of pendingModuleChanges) {
			if (enabled) orgModules.add(code);
			else orgModules.delete(code);
		}
		for (const mod of Object.values(MODULE_REGISTRY)) {
			if (mod.isCore) orgModules.add(mod.code);
		}
		try {
			await updateOrgModules({
				orgId: editingOrgId,
				modules: [...orgModules] as any,
			});
			toast.success(
				lang === "fr" ? "Modules mis à jour" : "Modules updated",
			);
			setPendingModuleChanges(new Map());
		} catch {
			toast.error(
				lang === "fr"
					? "Erreur lors de la sauvegarde"
					: "Error saving modules",
			);
		}
	};




	if (error) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
				<div className="text-destructive">
					{t("superadmin.common.error")}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
			{/* ─── Header ─── */}
			<PageHeader
				icon={<Building2 className="h-5 w-5" />}
				title={
					lang === "fr"
						? "Représentations diplomatiques"
						: "Diplomatic Representations"
				}
				subtitle={
					lang === "fr"
						? "Gérer les représentations, types, postes et modules"
						: "Manage representations, types, positions and modules"
				}
				actions={
					<Button asChild>
						<Link href="/reps/new">
							<Plus className="mr-1.5 h-4 w-4" />
							{lang === "fr"
								? "Nouvelle représentation"
								: "New representation"}
						</Link>
					</Button>
				}
			/>

			{/* ─── Onglets horizontaux ─── */}
			<Tabs defaultValue="representations" className="flex-1">
				<TabsList className="h-auto justify-start w-max gap-1 p-1">
					<TabsTrigger
						value="representations"
						className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background"
					>
						<Building2 className="h-3.5 w-3.5" />
						{lang === "fr" ? "Représentations" : "Representations"}
						{orgs && (
							<span className="text-[10px] text-muted-foreground ml-0.5">
								{(orgs as any[]).length}
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger
						value="types-templates"
						className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background"
					>
						<Globe className="h-3.5 w-3.5" />
						{lang === "fr" ? "Types & Templates" : "Types & Templates"}
					</TabsTrigger>
					<TabsTrigger
						value="module-matrix"
						className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background"
					>
						<Layers className="h-3.5 w-3.5" />
						{lang === "fr" ? "Matrice Modules" : "Module Matrix"}
					</TabsTrigger>
					{isSuperAdmin && (
						<TabsTrigger
							value="trash"
							className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-destructive"
						>
							<Trash2 className="h-3.5 w-3.5" />
							{lang === "fr" ? "Corbeille" : "Trash"}
							{trashedOrgs && (trashedOrgs as any[]).length > 0 && (
								<span className="text-[10px] text-destructive ml-0.5">
									{(trashedOrgs as any[]).length}
								</span>
							)}
						</TabsTrigger>
					)}
				</TabsList>

				{/* ─── Onglet 1 : Liste des représentations ─── */}
				<TabsContent value="representations" className="mt-4">
					<ContinentTabs
						data={orgs ?? []}
						getCountryCode={(org: Doc<"orgs">) => org.country}
					>
						{(filteredOrgs) => (
							<div className="flex flex-col flex-1 mt-2">
								<RepsGrid
									data={filteredOrgs}
								/>
							</div>
						)}
					</ContinentTabs>
				</TabsContent>

				{/* ─── Onglet 2 : Types & Templates ─── */}
				<TabsContent value="types-templates" className="mt-4">
					<RepsTypesTemplatesTab
						lang={lang}
						allOrgs={orgs}
						editingOrgId={editingOrgId}
						setEditingOrgId={setEditingOrgId}
						editingOrg={editingOrg}
						pendingModuleChanges={pendingModuleChanges}
						setPendingModuleChanges={setPendingModuleChanges}
						selectedOrgType={selectedOrgType}
						setSelectedOrgType={setSelectedOrgType}
					/>
				</TabsContent>

				{/* ─── Onglet 3 : Matrice Modules ─── */}
				<TabsContent value="module-matrix" className="mt-4">
					<RepsModuleMatrixTab
						lang={lang}
						templates={templates}
						selectedOrgType={selectedOrgType}
						setSelectedOrgType={setSelectedOrgType}
						editingOrgId={editingOrgId}
						editingOrg={editingOrg}
						pendingModuleChanges={pendingModuleChanges}
						setPendingModuleChanges={setPendingModuleChanges}
						handleSaveModules={handleSaveModules}
						isSavingModules={isSavingModules}
					/>
				</TabsContent>

				{/* ─── Onglet 4 : Corbeille (super-admin only) ─── */}
				{isSuperAdmin && (
					<TabsContent value="trash" className="mt-4">
						{trashedOrgs && (trashedOrgs as any[]).length > 0 ? (
							<RepsGrid data={trashedOrgs as Doc<"orgs">[]} />
						) : (
							<div className="flex flex-col items-center gap-3 py-16 bg-background rounded-xl border border-border/60">
								<div className="rounded-full bg-muted/60 p-4">
									<Trash2 className="h-8 w-8 text-muted-foreground" />
								</div>
								<div className="text-center">
									<p className="font-medium text-foreground/80">
										{lang === "fr"
											? "Corbeille vide"
											: "Trash is empty"}
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										{lang === "fr"
											? "Aucun organisme en attente de purge."
											: "No organization pending purge."}
									</p>
								</div>
							</div>
						)}
					</TabsContent>
				)}
			</Tabs>
		</div>
	);
}
