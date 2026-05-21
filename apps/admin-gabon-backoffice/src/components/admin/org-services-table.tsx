"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Edit3, FileText, Plus, Timer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/design-system/flat-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EditOrgServiceDialog } from "./services/EditOrgServiceDialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

interface OrgServicesTableProps {
	orgId: Id<"orgs">;
}

export function OrgServicesTable({ orgId }: OrgServicesTableProps) {
	const { t } = useTranslation();
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [selectedCommonService, setSelectedCommonService] =
		useState<string>("");
	const [activationForm, setActivationForm] = useState({
		fee: 0,
		currency: "XAF",
		requiresAppointment: true,
	});
	// Phase B7 : édition rapide pricing/SLA
	const [serviceToEdit, setServiceToEdit] = useState<{
		id: Id<"orgServices">;
		name: string;
		pricing?: { amount: number; currency: string };
		estimatedDays?: number;
		requireAgentValidation?: boolean;
	} | null>(null);

	const { data: orgServices, isPending: isLoadingOrgServices } =
		useAuthenticatedConvexQuery(api.functions.services.listByOrg, { orgId });

	const { data: commonServices, isPending: isLoadingCommon } =
		useAuthenticatedConvexQuery(api.functions.services.listCatalog, {});

	const { mutateAsync: activateService, isPending: isActivating } =
		useConvexMutationQuery(api.functions.services.activateForOrg);

	const { mutateAsync: toggleActive, isPending: isToggling } =
		useConvexMutationQuery(api.functions.services.toggleOrgServiceActive);

	const handleToggleActive = async (orgServiceId: Id<"orgServices">) => {
		try {
			await toggleActive({ orgServiceId });
			toast.success(t("superadmin.common.save") + " ");
		} catch (error) {
			toast.error(t("superadmin.common.error"));
		}
	};

	const handleActivateService = async () => {
		if (!selectedCommonService) return;

		try {
			await activateService({
				orgId,
				serviceId: selectedCommonService as Id<"services">,
				pricing: {
					// Store in euros
					amount: activationForm.fee,
					currency: activationForm.currency,
				},
				requiresAppointment: activationForm.requiresAppointment,
			});
			toast.success(`${t("superadmin.common.save")} `);
			setAddDialogOpen(false);
			setSelectedCommonService("");
			setActivationForm({ fee: 0, currency: "XAF", requiresAppointment: true });
		} catch (error: any) {
			toast.error(t(error.message) || t("superadmin.common.error"));
		}
	};

	const activatedServiceIds = orgServices?.map((s) => s.serviceId) || [];
	const availableServices =
		commonServices?.filter((s) => !activatedServiceIds.includes(s._id)) || [];

	if (isLoadingOrgServices) {
		return (
			<FlatCard>
				<div className="p-3 lg:p-4">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64 mt-1" />
				</div>
				<div className="p-3 lg:p-4 pt-0">
					<div className="space-y-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
			</FlatCard>
		);
	}

	return (
		<>
			<FlatCard>
				<div className="p-3 lg:p-4 flex flex-row items-center justify-between">
					<div>
						<p className="text-base font-semibold flex items-center gap-2">
							<FileText className="h-5 w-5" />
							{t("superadmin.organizations.tabs.services")}
						</p>
						<p className="text-sm text-muted-foreground">
							{t("superadmin.organizations.servicesDesc")}
						</p>
					</div>
					<Button
						onClick={() => setAddDialogOpen(true)}
						disabled={availableServices.length === 0}
					>
						<Plus className="mr-2 h-4 w-4" />
						{t("superadmin.services.form.create")}
					</Button>
				</div>
				<div className="p-3 lg:p-4 pt-0">
					{orgServices && orgServices.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("superadmin.services.columns.name")}</TableHead>
									<TableHead>
										{t("superadmin.services.columns.category")}
									</TableHead>
									<TableHead>{t("superadmin.services.table.fee")}</TableHead>
									<TableHead>SLA</TableHead>
									<TableHead>
										{t("superadmin.services.table.appointmentRequired")}
									</TableHead>
									<TableHead>
										{t("superadmin.services.columns.status")}
									</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{orgServices.map((service) => (
									<TableRow key={service._id}>
										<TableCell className="font-medium">
											{service.service?.name?.fr || "—"}
										</TableCell>
										<TableCell>
											{service.service?.category && (
												<Badge variant="secondary">
													{t(
														`superadmin.services.categories.${service.service.category}`,
													)}
												</Badge>
											)}
										</TableCell>
										<TableCell>
											<button
												type="button"
												className="text-left hover:underline cursor-pointer"
												onClick={() =>
													setServiceToEdit({
														id: service._id,
														name: service.service?.name?.fr ?? "Service",
														pricing: service.pricing,
														estimatedDays: service.estimatedDays,
														requireAgentValidation: (service as any).requireAgentValidation,
													})
												}
												title="Cliquer pour modifier"
											>
												{service.pricing?.amount && service.pricing.amount > 0
													? `${service.pricing.amount} ${(service.pricing.currency ?? "EUR").toUpperCase()}`
													: <span className="text-muted-foreground italic text-xs">Gratuit</span>}
											</button>
										</TableCell>
										<TableCell>
											{service.estimatedDays ? (
												<span className="inline-flex items-center gap-1 text-xs">
													<Timer className="h-3 w-3 text-muted-foreground" />
													{service.estimatedDays}j
												</span>
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell>
											{service.service?.requiresAppointment
												? t("superadmin.common.yes")
												: t("superadmin.common.no")}
										</TableCell>
										<TableCell>
											<Checkbox
												checked={service.isActive}
												onCheckedChange={() => handleToggleActive(service._id)}
												disabled={isToggling}
											/>
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													setServiceToEdit({
														id: service._id,
														name: service.service?.name?.fr ?? "Service",
														pricing: service.pricing,
														estimatedDays: service.estimatedDays,
														requireAgentValidation: (service as any).requireAgentValidation,
													})
												}
												className="h-7 px-2 text-xs"
												title="Modifier tarif et SLA"
											>
												<Edit3 className="h-3 w-3" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<div className="text-center py-8">
							<FileText className="mx-auto h-12 w-12 text-muted-foreground" />
							<p className="mt-2 text-muted-foreground">
								{t("superadmin.services.empty.org")}
							</p>
							<Button
								variant="outline"
								className="mt-4"
								onClick={() => setAddDialogOpen(true)}
								disabled={availableServices.length === 0}
							>
								<Plus className="mr-2 h-4 w-4" />
								{t("superadmin.services.actions.activate")}
							</Button>
						</div>
					)}
				</div>
			</FlatCard>

			{/* Add Service Sheet */}
			<Sheet open={addDialogOpen} onOpenChange={setAddDialogOpen}>
				<SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
					<SheetHeader>
						<SheetTitle>{t("superadmin.services.dialog.title")}</SheetTitle>
						<SheetDescription>
							{t("superadmin.services.dialog.description")}
						</SheetDescription>
					</SheetHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>{t("superadmin.services.columns.name")}</Label>
							<Select
								value={selectedCommonService}
								onValueChange={setSelectedCommonService}
							>
								<SelectTrigger>
									<SelectValue
										placeholder={t(
											"superadmin.services.dialog.selectPlaceholder",
										)}
									/>
								</SelectTrigger>
								<SelectContent>
									{isLoadingCommon ? (
										<div className="p-2 text-center text-muted-foreground">
											{t("superadmin.common.loading")}
										</div>
									) : availableServices.length === 0 ? (
										<div className="p-2 text-center text-muted-foreground">
											{t("superadmin.services.dialog.allActivated")}
										</div>
									) : (
										availableServices.map((service) => (
											<SelectItem key={service._id} value={service._id}>
												{service.name?.fr || "Unknown"}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>{t("superadmin.services.dialog.feeLabel")}</Label>
								<Input
									type="number"
									value={activationForm.fee}
									onChange={(e) =>
										setActivationForm({
											...activationForm,
											fee: Number(e.target.value),
										})
									}
									min={0}
								/>
							</div>
							<div className="space-y-2">
								<Label>{t("superadmin.services.dialog.currencyLabel")}</Label>
								<Select
									value={activationForm.currency}
									onValueChange={(v) =>
										setActivationForm({ ...activationForm, currency: v })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="XAF">XAF (FCFA)</SelectItem>
										<SelectItem value="EUR">EUR</SelectItem>
										<SelectItem value="USD">USD</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Checkbox
								id="requiresAppointment"
								checked={activationForm.requiresAppointment}
								onCheckedChange={(v: boolean) =>
									setActivationForm({
										...activationForm,
										requiresAppointment: v,
									})
								}
							/>
							<Label htmlFor="requiresAppointment">
								{t("superadmin.services.dialog.appointmentLabel")}
							</Label>
						</div>
					</div>

					<SheetFooter>
						<Button variant="outline" onClick={() => setAddDialogOpen(false)}>
							{t("superadmin.common.cancel")}
						</Button>
						<Button
							onClick={handleActivateService}
							disabled={!selectedCommonService || isActivating}
						>
							{isActivating
								? t("superadmin.services.dialog.submitting")
								: t("superadmin.services.dialog.submit")}
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			{/* ─── Dialog édition rapide pricing/SLA (Phase B7) ─── */}
			<EditOrgServiceDialog
				orgServiceId={serviceToEdit?.id ?? null}
				serviceName={serviceToEdit?.name ?? ""}
				initialPricing={serviceToEdit?.pricing}
				initialEstimatedDays={serviceToEdit?.estimatedDays}
				initialRequireAgentValidation={serviceToEdit?.requireAgentValidation}
				onClose={() => setServiceToEdit(null)}
			/>
		</>
	);
}
