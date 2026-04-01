"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
					// Store in euros (conversion to cents done only at Stripe call)
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
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							{t("superadmin.organizations.tabs.services")}
						</CardTitle>
						<CardDescription>
							{t("superadmin.organizations.servicesDesc")}
						</CardDescription>
					</div>
					<Button
						onClick={() => setAddDialogOpen(true)}
						disabled={availableServices.length === 0}
					>
						<Plus className="mr-2 h-4 w-4" />
						{t("superadmin.services.form.create")}
					</Button>
				</CardHeader>
				<CardContent>
					{orgServices && orgServices.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("superadmin.services.columns.name")}</TableHead>
									<TableHead>
										{t("superadmin.services.columns.category")}
									</TableHead>
									<TableHead>{t("superadmin.services.table.fee")}</TableHead>
									<TableHead>
										{t("superadmin.services.table.appointmentRequired")}
									</TableHead>
									<TableHead>
										{t("superadmin.services.columns.status")}
									</TableHead>
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
											{service.pricing?.amount} {service.pricing?.currency}
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
				</CardContent>
			</Card>

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
		</>
	);
}
