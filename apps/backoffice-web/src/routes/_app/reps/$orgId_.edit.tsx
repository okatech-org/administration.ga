/** biome-ignore-all lint/correctness/noChildrenProp: <explanation> */
"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { OrganizationType } from "@convex/lib/constants";
import { CountryCode } from "@convex/lib/validators";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export const Route = createFileRoute("/_app/reps/$orgId_/edit")({
	component: EditOrganizationPageWrapper,
});

// Wrapper component that provides the key prop
function EditOrganizationPageWrapper() {
	const { orgId } = Route.useParams();

	// Using orgId as key forces component recreation when navigating between orgs
	return <EditOrganizationForm key={orgId} orgId={orgId as Id<"orgs">} />;
}

interface EditOrganizationFormProps {
	orgId: Id<"orgs">;
}

function EditOrganizationForm({ orgId }: EditOrganizationFormProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	// Generate country options using translation keys
	const countryOptions: ComboboxOption<CountryCode>[] = Object.values(
		CountryCode,
	).map((code) => ({
		value: code,
		label: t(`superadmin.countryCodes.${code}`, code),
	}));

	const { data: org, isPending: isLoading } = useAuthenticatedConvexQuery(
		api.functions.orgs.getById,
		{ orgId },
	)

	const { mutateAsync: updateOrg, isPending } = useConvexMutationQuery(
		api.functions.orgs.update,
	)

	const form = useForm({
		defaultValues: {
			name: org?.name || "",
			type: (org?.type || OrganizationType.GeneralConsulate) as string,
			address: {
				street: org?.address.street || "",
				city: org?.address.city || "",
				postalCode: org?.address.postalCode || "",
				country: org?.address.country || CountryCode.GA,
			},
			email: org?.email || "",
			phone: org?.phone || "",
			website: org?.website || "",
			timezone: org?.timezone || "Europe/Paris",
			jurisdictionCountries: org?.jurisdictionCountries || ([] as string[]),
			logoUrl: org?.logoUrl || "",
			settings: org?.settings || {
				appointmentBuffer: 24,
				maxActiveRequests: 10,
				workingHours: {
					monday: [{ start: "09:00", end: "17:00", isOpen: true }],
					tuesday: [{ start: "09:00", end: "17:00", isOpen: true }],
					wednesday: [{ start: "09:00", end: "17:00", isOpen: true }],
					thursday: [{ start: "09:00", end: "17:00", isOpen: true }],
					friday: [{ start: "09:00", end: "17:00", isOpen: true }],
					saturday: [{ start: "09:00", end: "12:00", isOpen: false }],
					sunday: [{ start: "00:00", end: "00:00", isOpen: false }],
				},
			},
		},
		onSubmit: async ({ value }) => {
			if (!value.name || value.name.length < 3) {
				toast.error("Name must be at least 3 characters");
				return
			}
			if (
				!value.address.street ||
				!value.address.city ||
				!value.address.country
			) {
				toast.error("Street, city, and country are required");
				return
			}

			try {
				await updateOrg({
					orgId,
					name: value.name,
					address: {
						street: value.address.street,
						city: value.address.city,
						postalCode: value.address.postalCode,
						country: value.address.country,
						coordinates: undefined,
					},
					email: value.email || undefined,
					phone: value.phone || undefined,
					website: value.website || undefined,
					timezone: value.timezone,
					jurisdictionCountries: value.jurisdictionCountries as CountryCode[],
					logoUrl: value.logoUrl || undefined,
					settings: value.settings,
				})
				toast.success(t("superadmin.organizations.form.edit") + " ");
				navigate({ to: `/reps/${orgId}` });
			} catch (error) {
				toast.error(t("superadmin.common.error"));
			}
		},
	})

	if (isLoading) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-48" />
				<Card className="max-w-2xl">
					<CardContent className="pt-6 space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!org) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/reps" })}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					{t("superadmin.common.back")}
				</Button>
				<div className="text-destructive">{t("errors.orgs.notFound")}</div>
			</div>
		)
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: `/reps/${orgId}` })}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					{t("superadmin.common.back")}
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("superadmin.organizations.form.edit")}</CardTitle>
					<CardDescription>{org.name}</CardDescription>
				</CardHeader>
				<CardContent>
					{/** biome-ignore lint/correctness/useUniqueElementIds: <explanation> */}
					<form
						id="org-form"
						onSubmit={(e) => {
							e.preventDefault()
							form.handleSubmit()
						}}
					>
						<FieldGroup>
							{/* Name */}
							<form.Field
								name="name"
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												{t("superadmin.organizations.form.name")}
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
												placeholder={t(
													"superadmin.organizations.form.namePlaceholder",
												)}
												autoComplete="off"
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									)
								}}
							/>

							{/* Type (read-only display) */}
							<Field>
								<FieldLabel>
									{t("superadmin.organizations.form.type")}
								</FieldLabel>
								<div className="flex items-center h-10 px-3 bg-muted rounded-md text-muted-foreground">
									{t(`superadmin.types.${org.type}`)}
								</div>
								<p className="text-xs text-muted-foreground">
									{t("superadmin.organizations.form.typeReadonly") ||
										"Le type d'organisation ne peut pas être modifié."}
								</p>
							</Field>

							{/* Address Section */}
							<div className="pt-4">
								<h3 className="font-medium mb-2">
									{t("superadmin.organizations.form.address")}
								</h3>
								<div className="grid gap-4">
									<form.Field
										name="address.street"
										children={(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel htmlFor={field.name}>
														{t("superadmin.organizations.form.street")}
													</FieldLabel>
													<Input
														id={field.name}
														name={field.name}
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														aria-invalid={isInvalid}
													/>
													{isInvalid && (
														<FieldError errors={field.state.meta.errors} />
													)}
												</Field>
											)
										}}
									/>

									<div className="grid grid-cols-2 gap-4">
										<form.Field
											name="address.city"
											children={(field) => {
												const isInvalid =
													field.state.meta.isTouched &&
													!field.state.meta.isValid
												return (
													<Field data-invalid={isInvalid}>
														<FieldLabel htmlFor={field.name}>
															{t("superadmin.organizations.form.city")}
														</FieldLabel>
														<Input
															id={field.name}
															name={field.name}
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															aria-invalid={isInvalid}
														/>
														{isInvalid && (
															<FieldError errors={field.state.meta.errors} />
														)}
													</Field>
												)
											}}
										/>

										<form.Field
											name="address.postalCode"
											children={(field) => (
												<Field>
													<FieldLabel htmlFor={field.name}>
														{t("superadmin.organizations.form.postalCode")}
													</FieldLabel>
													<Input
														id={field.name}
														name={field.name}
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
													/>
												</Field>
											)}
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<form.Field
											name="address.country"
											children={(field) => {
												const isInvalid =
													field.state.meta.isTouched &&
													!field.state.meta.isValid
												return (
													<Field data-invalid={isInvalid}>
														<FieldLabel htmlFor={field.name}>
															{t("superadmin.organizations.form.country")}
														</FieldLabel>
														<Combobox
															options={countryOptions}
															value={field.state.value}
															onValueChange={(val) => field.handleChange(val)}
															placeholder={t(
																"superadmin.organizations.form.jurisdictionPlaceholder",
															)}
															searchPlaceholder={
																t("superadmin.common.search") || "Rechercher..."
															}
															aria-invalid={isInvalid}
														/>
														{isInvalid && (
															<FieldError errors={field.state.meta.errors} />
														)}
													</Field>
												)
											}}
										/>
									</div>
								</div>
							</div>

							{/* Contact Section */}
							<div className="pt-4">
								<h3 className="font-medium mb-2">
									{t("superadmin.organizations.form.contact")}
								</h3>
								<div className="grid gap-4">
									<form.Field
										name="email"
										children={(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel htmlFor={field.name}>
														{t("superadmin.organizations.form.email")}
													</FieldLabel>
													<Input
														id={field.name}
														name={field.name}
														type="email"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														aria-invalid={isInvalid}
													/>
													{isInvalid && (
														<FieldError errors={field.state.meta.errors} />
													)}
												</Field>
											)
										}}
									/>

									<form.Field
										name="phone"
										children={(field) => (
											<Field>
												<FieldLabel htmlFor={field.name}>
													{t("superadmin.organizations.form.phone")}
												</FieldLabel>
												<Input
													id={field.name}
													name={field.name}
													type="tel"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
											</Field>
										)}
									/>

									<form.Field
										name="website"
										children={(field) => {
											const isInvalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											return (
												<Field data-invalid={isInvalid}>
													<FieldLabel htmlFor={field.name}>
														{t("superadmin.organizations.form.website")}
													</FieldLabel>
													<Input
														id={field.name}
														name={field.name}
														type="url"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														aria-invalid={isInvalid}
														placeholder="https://"
													/>
													{isInvalid && (
														<FieldError errors={field.state.meta.errors} />
													)}
												</Field>
											)
										}}
									/>
								</div>
							</div>
						</FieldGroup>

						{/* Extended Settings */}
						<div className="pt-6 border-t mt-6">
							<h3 className="text-lg font-medium mb-4">
								{t("superadmin.organizations.form.advancedConfig")}
							</h3>

							{/* Jurisdiction */}
							<form.Field
								name="jurisdictionCountries"
								children={(field) => (
									<Field>
										<FieldLabel>
											{t("superadmin.organizations.form.jurisdiction")}
										</FieldLabel>
										<Combobox
											options={countryOptions.filter(
												(opt) => !(field.state.value || []).includes(opt.value),
											)}
											value={null}
											onValueChange={(val) => {
												const current = field.state.value || [];
												if (!current.includes(val))
													field.handleChange([...current, val])
											}}
											placeholder={t(
												"superadmin.organizations.form.jurisdictionPlaceholder",
											)}
											searchPlaceholder={
												t("superadmin.common.search") || "Rechercher..."
											}
										/>
										<div className="flex flex-wrap gap-2 mt-2">
											{field.state.value?.map((code) => (
												<div
													key={code}
													className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm flex items-center gap-1"
												>
													{t(`superadmin.countryCodes.${code}`, code)}
													<button
														type="button"
														onClick={() =>
															field.handleChange(
																field.state.value.filter((c) => c !== code),
															)
														}
														className="text-muted-foreground hover:text-foreground"
													>
														×
													</button>
												</div>
											))}
										</div>
									</Field>
								)}
							/>

							{/* Logo URL */}
							<form.Field
								name="logoUrl"
								children={(field) => (
									<Field className="mt-4">
										<FieldLabel>Logo URL</FieldLabel>
										<Input
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="https://..."
										/>
									</Field>
								)}
							/>

							{/* Settings - Simplified View */}
							<div className="grid grid-cols-2 gap-4 mt-4">
								<form.Field
									name="settings.appointmentBuffer"
									children={(field) => (
										<Field>
											<FieldLabel>Délai RDV (heures)</FieldLabel>
											<Input
												type="number"
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(Number(e.target.value))
												}
											/>
										</Field>
									)}
								/>
								<form.Field
									name="settings.maxActiveRequests"
									children={(field) => (
										<Field>
											<FieldLabel>Max Demandes Actives</FieldLabel>
											<Input
												type="number"
												value={field.state.value}
												onChange={(e) =>
													field.handleChange(Number(e.target.value))
												}
											/>
										</Field>
									)}
								/>
							</div>
						</div>
					</form>
				</CardContent>
				<CardFooter className="flex justify-between">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: `/reps/${orgId}` })}
					>
						{t("superadmin.organizations.form.cancel")}
					</Button>
					<Button type="submit" form="org-form" disabled={isPending}>
						{isPending
							? t("superadmin.organizations.form.saving")
							: t("superadmin.organizations.form.save")}
					</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
