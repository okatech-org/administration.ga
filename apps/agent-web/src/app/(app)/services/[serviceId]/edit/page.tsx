"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useForm } from "@tanstack/react-form";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useOrg } from "@/components/org/org-provider";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";


export default function ServiceEdit() {
	const formId = useId();
	const { serviceId } = useParams();
	const { activeOrgId } = useOrg();
	const router = useRouter();
	const { t } = useTranslation();

	const { data } = useAuthenticatedConvexQuery(
		api.functions.services.getOrgServiceById,
		{ orgServiceId: serviceId as Id<"orgServices"> },
	);

	const { mutateAsync: updateConfig } = useConvexMutationQuery(
		api.functions.services.updateOrgService,
	);

	const form = useForm({
		defaultValues: {
			isActive: data?.isActive ?? false,
			fee: data?.pricing?.amount ?? 0,
			currency: data?.pricing?.currency ?? "XAF",
			estimatedDays: data?.estimatedDays ?? 0,
			depositInstructions: data?.depositInstructions ?? "",
			pickupInstructions: data?.pickupInstructions ?? "",
			requiresAppointment: data?.requiresAppointment ?? false,
			requiresAppointmentForPickup: data?.requiresAppointmentForPickup ?? false,
		},
		onSubmit: async ({ value }) => {
			if (!activeOrgId) {
				toast.error(
					t("dashboard.services.edit.noOrgError") || "Représentation introuvable",
				);
				return;
			}

			try {
				await updateConfig({
					orgServiceId: data?._id as Id<"orgServices">,
					isActive: value.isActive,
					pricing: {
						amount: value.fee,
						currency: value.currency,
					},
					estimatedDays: value.estimatedDays,
					depositInstructions: value.depositInstructions || undefined,
					pickupInstructions: value.pickupInstructions || undefined,
					requiresAppointment: value.requiresAppointment,
					requiresAppointmentForPickup: value.requiresAppointmentForPickup,
				});
				toast.success(t("dashboard.services.edit.saved"));
			} catch (err: any) {
				const errorMessage =
					err.message || t("dashboard.services.edit.saveError");
				toast.error(errorMessage);
			}
		},
	});

	if (!data) {
		return (
			<div className="p-4 md:p-6 space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-[600px] max-w-3xl" />
			</div>
		);
	}

	return (
		<form
			id={formId}
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 md:p-6 overflow-hidden"
		>
			<div className="flex items-center justify-between shrink-0">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						className="active:scale-[0.97] transition-transform"
						onClick={(e) => {
							e.preventDefault(); // Prevent form submit
							router.push("/services");
						}}
						type="button"
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							{t("dashboard.services.edit.title")}
						</h1>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button type="submit" className="active:scale-[0.97] transition-transform">
						<Save className="mr-2 h-4 w-4" />
						{t("dashboard.services.edit.save")}
					</Button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				<Tabs defaultValue="general" className="w-full">
					<TabsList className="mb-4">
						<TabsTrigger value="general">
							{t("dashboard.services.edit.tabs.general")}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="general">
						<div className="grid gap-6">
							<FlatCard>
								<div className="p-3 lg:p-4 pb-0">
									<h3 className="text-sm font-bold">{t("dashboard.services.edit.serviceInfo")}</h3>
									<p className="text-xs text-muted-foreground mt-1">
										Configuration generale du service
									</p>
								</div>
								<div className="p-3 lg:p-4 space-y-4">
									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<Label>{t("dashboard.services.edit.activate")}</Label>
											<p className="text-sm text-muted-foreground">
												Rendre ce service visible pour les usagers
											</p>
										</div>
										<form.Field
											name="isActive"
											children={(field) => (
												<Switch
													checked={field.state.value}
													onCheckedChange={field.handleChange}
												/>
											)}
										/>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<form.Field
											name="fee"
											children={(field) => (
												<div className="space-y-2">
													<Label>{t("dashboard.services.edit.fee")}</Label>
													<div className="flex gap-2">
														<Input
															type="number"
															value={field.state.value}
															onChange={(e) =>
																field.handleChange(Number(e.target.value))
															}
														/>
														<form.Field
															name="currency"
															children={(subField) => (
																<Select
																	value={subField.state.value}
																	onValueChange={subField.handleChange}
																>
																	<SelectTrigger className="w-[100px]">
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="XAF">XAF</SelectItem>
																		<SelectItem value="EUR">EUR</SelectItem>
																	</SelectContent>
																</Select>
															)}
														/>
													</div>
												</div>
											)}
										/>
										<form.Field
											name="estimatedDays"
											children={(field) => {
												const isInvalid =
													field.state.meta.isTouched &&
													!field.state.meta.isValid;
												return (
													<Field data-invalid={isInvalid}>
														<FieldLabel htmlFor={field.name}>
															{t("dashboard.services.edit.estimatedDays")}
														</FieldLabel>
														<Input
															id={field.name}
															type="number"
															min="0"
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(Number(e.target.value))
															}
														/>
														{isInvalid && (
															<FieldError errors={field.state.meta.errors} />
														)}
													</Field>
												);
											}}
										/>
									</div>

									<div className="flex items-center gap-2">
										<form.Field
											name="requiresAppointment"
											children={(field) => (
												<Switch
													id="requiresAppointment"
													checked={field.state.value}
													onCheckedChange={(checked) =>
														field.handleChange(checked)
													}
												/>
											)}
										/>
										<Label htmlFor="requiresAppointment">
											{t("dashboard.services.edit.requiresAppointment") ||
												"Rendez-vous requis (dépôt)"}
										</Label>
									</div>

									<div className="flex items-center gap-2">
										<form.Field
											name="requiresAppointmentForPickup"
											children={(field) => (
												<Switch
													id="requiresAppointmentForPickup"
													checked={field.state.value}
													onCheckedChange={(checked) =>
														field.handleChange(checked)
													}
												/>
											)}
										/>
										<Label htmlFor="requiresAppointmentForPickup">
											Rendez-vous requis (retrait)
										</Label>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<form.Field
											name="depositInstructions"
											children={(field) => {
												const isInvalid =
													field.state.meta.isTouched &&
													!field.state.meta.isValid;
												return (
													<Field data-invalid={isInvalid}>
														<FieldLabel htmlFor={field.name}>
															{t(
																"dashboard.services.edit.depositInstructions",
																"Instructions de dépôt",
															)}
														</FieldLabel>
														<Textarea
															id={field.name}
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															placeholder={t(
																"dashboard.services.edit.depositInstructionsPlaceholder",
																"Documents à apporter, présentation physique requise, etc.",
															)}
															className="min-h-[120px]"
														/>
														{isInvalid && (
															<FieldError errors={field.state.meta.errors} />
														)}
													</Field>
												);
											}}
										/>

										<form.Field
											name="pickupInstructions"
											children={(field) => {
												const isInvalid =
													field.state.meta.isTouched &&
													!field.state.meta.isValid;
												return (
													<Field data-invalid={isInvalid}>
														<FieldLabel htmlFor={field.name}>
															{t(
																"dashboard.services.edit.pickupInstructions",
																"Instructions de retrait",
															)}
														</FieldLabel>
														<Textarea
															id={field.name}
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															placeholder={t(
																"dashboard.services.edit.pickupInstructionsPlaceholder",
																"Apporter le récépissé, procuration acceptée, etc.",
															)}
															className="min-h-[120px]"
														/>
														{isInvalid && (
															<FieldError errors={field.state.meta.errors} />
														)}
													</Field>
												);
											}}
										/>
									</div>
								</div>
							</FlatCard>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</form>
	);
}

function Label({
	children,
	className,
	htmlFor,
}: {
	children: React.ReactNode;
	className?: string;
	htmlFor?: string;
}) {
	return (
		<FieldLabel className={className} htmlFor={htmlFor}>
			{children}
		</FieldLabel>
	);
}
