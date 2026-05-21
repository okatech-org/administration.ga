"use client";

import { api } from "@convex/_generated/api";
import type { Id, Doc } from "@convex/_generated/dataModel";
import {
	Building2,
	CheckCircle2,
	CreditCard,
	Loader2,
	Printer,
	Settings,
	Shield,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAuthenticatedConvexQuery, useConvexMutationQuery } from "@/integrations/convex/hooks";


export default function PrintSettingsPage() {
	const [selectedOrg, setSelectedOrg] = useState<Doc<"orgs"> | null>(null);
	const [showConfigDialog, setShowConfigDialog] = useState(false);
	const [updatingOrgId, setUpdatingOrgId] = useState<Id<"orgs"> | null>(null);

	// Get all active organizations
	const { data: orgs } = useAuthenticatedConvexQuery(
		api.functions.orgs.list,
		{},
	);

	// Mutation to update org settings
	const { mutateAsync: updateOrgSettings, isPending: isUpdating } = useConvexMutationQuery(
		api.functions.orgs.update,
	);

	const handleTogglePrint = async (org: Doc<"orgs">, enabled: boolean) => {
		setUpdatingOrgId(org._id);
		try {
			await updateOrgSettings({
				orgId: org._id,
				settings: {
					appointmentBuffer: org.settings?.appointmentBuffer ?? 30,
					maxActiveRequests: org.settings?.maxActiveRequests ?? 5,
					workingHours: org.settings?.workingHours ?? {},
					...org.settings,
					printEnabled: enabled,
				},
			});
			toast.success(
				enabled
					? `Impression activée pour ${org.shortName ?? org.name}`
					: `Impression désactivée pour ${org.shortName ?? org.name}`,
			);
		} catch (err) {
			toast.error("Erreur lors de la mise à jour des paramètres");
		} finally {
			setUpdatingOrgId(null);
		}
	};

	const handleConfigureOrg = (org: Doc<"orgs">) => {
		setSelectedOrg(org);
		setShowConfigDialog(true);
	};

	const activeOrgs = orgs?.filter((o) => o.isActive && !o.deletedAt) ?? [];
	const printEnabledCount = activeOrgs.filter(
		(o) => o.settings?.printEnabled,
	).length;
	const hasConsularCardsModule = (org: Doc<"orgs">) =>
		org.modules?.includes("consular_cards" as any) ?? false;

	return (
		<div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
			{/* Header */}
			<PageHeader
				icon={<Printer className="h-5 w-5" />}
				title="Paramétrage Impression"
				subtitle="Gérez l'accès à l'impression des cartes consulaires par représentation"
			/>

			{/* Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-primary">{activeOrgs.length}</div>
						<div className="text-xs text-muted-foreground">Représentations actives</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-green-600">{printEnabledCount}</div>
						<div className="text-xs text-muted-foreground">Impression activée</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-amber-600">
							{activeOrgs.length - printEnabledCount}
						</div>
						<div className="text-xs text-muted-foreground">Impression désactivée</div>
					</div>
				</FlatCard>
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="text-2xl font-bold text-blue-600">
							{activeOrgs.filter(hasConsularCardsModule).length}
						</div>
						<div className="text-xs text-muted-foreground">Module "Cartes" actif</div>
					</div>
				</FlatCard>
			</div>

			{/* Info banner */}
			<FlatCard className="border border-blue-500/20">
				<div className="p-3 lg:p-4">
					<div className="flex items-start gap-3">
						<Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
						<div className="text-sm">
							<p className="font-medium text-blue-900 dark:text-blue-300">
								Double couche de sécurité
							</p>
							<p className="text-blue-700/80 dark:text-blue-400/80 mt-1 text-xs">
								L'impression nécessite <strong>deux conditions</strong> :
								le toggle <code className="bg-blue-500/10 px-1 py-0.5 rounded text-[11px]">printEnabled</code> activé ici,
								ET la permission <code className="bg-blue-500/10 px-1 py-0.5 rounded text-[11px]">consular_cards.manage</code> attribuée
								au rôle de l'agent dans la représentation.
							</p>
						</div>
					</div>
				</div>
			</FlatCard>

			{/* Orgs Table */}
			<FlatCard>
				<div className="p-3 lg:p-4 space-y-3">
					<div>
						<h3 className="text-sm font-semibold flex items-center gap-2">
							<Building2 className="h-5 w-5" />
							Représentations diplomatiques
						</h3>
						<p className="text-xs text-muted-foreground mt-1">
							Activez ou désactivez l'impression des cartes consulaires pour chaque représentation
						</p>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Représentation</TableHead>
								<TableHead>Pays</TableHead>
								<TableHead>Module Cartes</TableHead>
								<TableHead className="text-center">Impression</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{activeOrgs.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
										<Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
										Chargement des représentations...
									</TableCell>
								</TableRow>
							) : (
								activeOrgs.map((org) => {
									const hasModule = hasConsularCardsModule(org);
									const isPrintEnabled = org.settings?.printEnabled ?? false;
									const isThisUpdating = updatingOrgId === org._id;

									return (
										<TableRow key={org._id}>
											<TableCell>
												<div className="flex items-center gap-3">
													{org.logoUrl ? (
														<img
															src={org.logoUrl}
															alt={org.name}
															className="h-8 w-8 rounded-md object-cover border"
														/>
													) : (
														<div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
															<Building2 className="h-4 w-4 text-primary" />
														</div>
													)}
													<div>
														<p className="font-medium text-sm">
															{org.shortName ?? org.name}
														</p>
														<p className="text-xs text-muted-foreground">
															{org.name}
														</p>
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline" className="text-xs">
													{org.country}
												</Badge>
											</TableCell>
											<TableCell>
												{hasModule ? (
													<Badge className="text-[10px] bg-green-500/10 text-green-700 border-green-500/20">
														<CheckCircle2 className="h-3 w-3 mr-1" />
														Actif
													</Badge>
												) : (
													<Badge variant="secondary" className="text-[10px]">
														<XCircle className="h-3 w-3 mr-1" />
														Inactif
													</Badge>
												)}
											</TableCell>
											<TableCell className="text-center">
												<div className="flex items-center justify-center gap-2">
													{isThisUpdating ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<Switch
															checked={isPrintEnabled}
															onCheckedChange={(checked) =>
																handleTogglePrint(org, checked)
															}
															disabled={!hasModule || isUpdating}
														/>
													)}
												</div>
											</TableCell>
											<TableCell className="text-right">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleConfigureOrg(org)}
												>
													<Settings className="h-4 w-4 mr-1" />
													Configurer
												</Button>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			</FlatCard>

			{/* Config Dialog */}
			<Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Settings className="h-5 w-5" />
							Configuration — {selectedOrg?.shortName ?? selectedOrg?.name}
						</DialogTitle>
						<DialogDescription>
							Paramètres d'impression pour cette représentation
						</DialogDescription>
					</DialogHeader>

					{selectedOrg && (
						<div className="space-y-6 py-4">
							{/* Print toggle */}
							<div className="flex items-center justify-between rounded-lg border p-4">
								<div className="space-y-0.5">
									<Label htmlFor="printEnabled" className="text-base font-medium">
										Impression activée
									</Label>
									<p className="text-xs text-muted-foreground">
										Permet aux agents de cette représentation d'imprimer via EasyCard
									</p>
								</div>
								<Switch
									id="printEnabled"
									checked={selectedOrg.settings?.printEnabled ?? false}
									onCheckedChange={(checked) =>
										handleTogglePrint(selectedOrg, checked)
									}
									disabled={!hasConsularCardsModule(selectedOrg)}
								/>
							</div>

							{/* Module status */}
							<div className="rounded-lg border p-4 space-y-2">
								<Label className="text-sm font-medium">Module "Cartes Consulaires"</Label>
								{hasConsularCardsModule(selectedOrg) ? (
									<div className="flex items-center gap-2 text-green-700 dark:text-green-400">
										<CheckCircle2 className="h-4 w-4" />
										<span className="text-xs">Module actif pour cette représentation</span>
									</div>
								) : (
									<div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
										<XCircle className="h-4 w-4" />
										<span className="text-xs">
											Module inactif — Activez le module "Affaires Consulaires" dans les paramètres de l'organisation
										</span>
									</div>
								)}
							</div>

							{/* Card design info */}
							<div className="rounded-lg border p-4 space-y-2">
								<Label className="text-sm font-medium flex items-center gap-2">
									<CreditCard className="h-4 w-4" />
									Template de carte
								</Label>
								<p className="text-xs text-muted-foreground">
									{selectedOrg.settings?.defaultCardDesignId
										? "Un template de carte est configuré pour cette représentation"
										: "Aucun template spécifique — le template par défaut sera utilisé"}
								</p>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button variant="outline" onClick={() => setShowConfigDialog(false)}>
							Fermer
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
