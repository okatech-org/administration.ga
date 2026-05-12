"use client";

import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { Link } from "@workspace/routing";
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import {
	Bell,
	Bot,
	Briefcase,
	Building2,
	Check,
	Clock,
	CreditCard,
	Edit,
	FileSignature,
	Globe,
	KeyRound,
	Loader2,
	Lock,
	LogOut,
	Mail,
	Palette,
	Phone,
	Plus,
	Save,
	Settings2,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useOrg } from "../../shell/org-provider";
import { useAuthClient } from "../../shell/auth-client-provider";
import { CallLinesSettings } from "./components/call-lines-settings";
import {
	SettingsDivider,
	SettingsLayout,
	SettingsRow,
	SettingsSectionHeader,
	type SettingsTabGroup,
} from "./components/settings-layout";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";

import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { SignatureSettingsCard } from "./components/signature-settings-card";
import { useCanDoTask } from "../../hooks/useCanDoTask";
import { type ConsularTheme, useConsularTheme } from "../../hooks/useConsularTheme";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";
import type {
	PageAction,
	PageEntity,
} from "../../stores/page-context-store";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";


const DAYS_OF_WEEK = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
];

export default function DashboardSettings() {
	const { activeOrgId } = useOrg();
	const { t } = useTranslation();
	const authClient = useAuthClient();
	const [isEditing, setIsEditing] = useState(false);
	const [activeTab, setActiveTab] = useState("profile");

	const [showLogoutDialog, setShowLogoutDialog] = useState(false);
	const { canDo, isReady: permissionsReady } = useCanDoTask(
		activeOrgId ?? undefined,
	);
	// Settings-module access gating is handled by individual permissions via
	// `canDo(...)` / `useModuleAccess` where needed inside sub-sections.

	// ── Session data ──
	const { data: session } = authClient.useSession();

	const settingsTabs: { id: string; label: string }[] = [
		{ id: "profile", label: "Profil" },
		{ id: "security", label: "Sécurité" },
		{ id: "notifications", label: "Notifications" },
		{ id: "preferences", label: "Préférences" },
		{ id: "schedule", label: "Disponibilités" },
		{ id: "call_lines", label: "Lignes d'appel" },
	];
	const pageEntities: PageEntity[] = settingsTabs.map((tab) => ({
		id: `settings-tab.${tab.id}`,
		type: "settings-tab",
		label: tab.label,
		data: { tabId: tab.id, active: tab.id === activeTab },
	}));
	const pageActions: PageAction[] = [
		{
			id: "settings.switch_tab",
			label: "Changer d'onglet paramètres",
			description:
				"Active un onglet de paramètres. params.tab ∈ ['profile','security','notifications','preferences','schedule','call_lines'].",
			params: { tab: { type: "string" } },
		},
		{
			id: "settings.toggle_edit",
			label: "Basculer le mode édition",
			description:
				"Active/désactive le mode édition de la section profil. params.editing (boolean optionnel, sinon toggle).",
			params: { editing: { type: "boolean" } },
		},
	];
	usePageContext({
		module: "settings",
		title: "Paramètres",
		summary: `Paramètres du compte agent. Onglet ${activeTab}.${isEditing ? " Mode édition." : ""}`,
		visibleEntities: pageEntities,
		availableActions: pageActions,
		scopedToolNames: [],
	});
	useRegisterPageAction("settings.switch_tab", async (params) => {
		const tab = params?.tab as string | undefined;
		if (!tab) throw new Error("tab requis");
		setActiveTab(tab);
		return { success: true, tab };
	});
	useRegisterPageAction("settings.toggle_edit", async (params) => {
		const editing = params?.editing;
		if (typeof editing === "boolean") setIsEditing(editing);
		else setIsEditing((cur) => !cur);
		return { success: true };
	});

	// ── OTP reset state ──
	const [resetStep, setResetStep] = useState<"idle" | "otp_sent" | "done">(
		"idle",
	);
	const [resetOtp, setResetOtp] = useState("");
	const [resetNewPassword, setResetNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [resetLoading, setResetLoading] = useState(false);
	const [resetError, setResetError] = useState<string | null>(null);
	const [resetSuccess, setResetSuccess] = useState(false);

	const handleSendResetOtp = async () => {
		const email = session?.user?.email;
		if (!email) return;
		setResetError(null);
		setResetLoading(true);
		try {
			const result = await authClient.emailOtp.sendVerificationOtp({
				email,
				type: "forget-password",
			});
			if (result.error) {
				setResetError(
					result.error.message || t("settings.security.changeFailed"),
				);
			} else {
				setResetStep("otp_sent");
			}
		} catch {
			setResetError(t("settings.security.changeFailed"));
		} finally {
			setResetLoading(false);
		}
	};

	const handleResetWithOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		const email = session?.user?.email;
		if (!email) return;
		if (resetNewPassword.length < 8) {
			setResetError(t("settings.security.passwordTooShort"));
			return;
		}
		if (resetNewPassword !== confirmPassword) {
			setResetError(t("settings.security.passwordMismatch"));
			return;
		}
		setResetError(null);
		setResetLoading(true);
		try {
			const result = await authClient.emailOtp.resetPassword({
				email,
				otp: resetOtp,
				password: resetNewPassword,
			});
			if (result.error) {
				setResetError(
					result.error.message || t("settings.security.changeFailed"),
				);
			} else {
				setResetSuccess(true);
				setResetStep("done");
				setResetOtp("");
				setResetNewPassword("");
				setConfirmPassword("");
				setTimeout(() => {
					setResetSuccess(false);
					setResetStep("idle");
				}, 4000);
			}
		} catch {
			setResetError(t("settings.security.changeFailed"));
		} finally {
			setResetLoading(false);
		}
	};

	// Granular permission checks
	const canViewOrgSettings = permissionsReady && canDo("settings.view");
	const canManageSettings = permissionsReady && canDo("settings.manage");

	const { data: org } = useAuthenticatedConvexQuery(
		api.functions.orgs.getById,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);
	const { mutateAsync: updateProfile } = useConvexMutationQuery(
		api.functions.orgs.update,
	);

	const form = useForm({
		defaultValues: {
			name: org?.name || "",
			description: org?.description || "",
			phone: org?.phone || "",
			email: org?.email || "",
			website: org?.website || "",
			street: org?.address?.street || "",
			city: org?.address?.city || "",
			postalCode: org?.address?.postalCode || "",
			country: org?.address?.country || "",
			workingHours: org?.settings?.workingHours || {},
			appointmentBuffer: org?.settings?.appointmentBuffer || 30,
			requestAssignment:
				(org?.settings?.requestAssignment as string) || "manual",
			defaultProcessingDays: org?.settings?.defaultProcessingDays || 15,
			aiAnalysisEnabled: org?.settings?.aiAnalysisEnabled !== false,
		},
		onSubmit: async ({ value }) => {
			if (!activeOrgId) return;

			try {
				await updateProfile({
					orgId: activeOrgId,
					name: value.name || undefined,
					description: value.description || undefined,
					phone: value.phone || undefined,
					email: value.email || undefined,
					website: value.website || undefined,
					address: {
						street: value.street,
						city: value.city,
						postalCode: value.postalCode,
						country: value.country as any,
					},
					settings: {
						workingHours: value.workingHours,
						appointmentBuffer: Number(value.appointmentBuffer),
						maxActiveRequests: org?.settings?.maxActiveRequests || 10,
						requestAssignment: value.requestAssignment as "manual" | "auto",
						defaultProcessingDays: Number(value.defaultProcessingDays),
						aiAnalysisEnabled: value.aiAnalysisEnabled,
					},
				});
				toast.success(t("dashboard.settings.updateSuccess"));
				setIsEditing(false);
			} catch (error) {
				toast.error(t("dashboard.settings.updateError"));
			}
		},
	});

	const handleEdit = () => {
		if (org) {
			form.setFieldValue("name", org.name || "");
			form.setFieldValue("description", org.description || "");
			form.setFieldValue("phone", org.phone || "");
			form.setFieldValue("email", org.email || "");
			form.setFieldValue("website", org.website || "");
			form.setFieldValue("street", org.address?.street || "");
			form.setFieldValue("city", org.address?.city || "");
			form.setFieldValue("postalCode", org.address?.postalCode || "");
			form.setFieldValue("country", org.address?.country || "");
			form.setFieldValue("workingHours", org?.settings?.workingHours || {});
			form.setFieldValue(
				"appointmentBuffer",
				org?.settings?.appointmentBuffer || 30,
			);
			form.setFieldValue(
				"requestAssignment",
				(org?.settings?.requestAssignment as string) || "manual",
			);
			form.setFieldValue(
				"defaultProcessingDays",
				org?.settings?.defaultProcessingDays || 15,
			);
			form.setFieldValue(
				"aiAnalysisEnabled",
				org?.settings?.aiAnalysisEnabled !== false,
			);
			setIsEditing(true);
		}
	};

	if (org === undefined || !permissionsReady) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
				<Skeleton className="h-8 w-64" />
				<div className="grid gap-4 md:grid-cols-2">
					<Skeleton className="h-[200px]" />
					<Skeleton className="h-[200px]" />
				</div>
			</div>
		);
	}

	if (!org) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center p-4">
				<p className="text-muted-foreground">
					{t("dashboard.settings.notFound")}
				</p>
			</div>
		);
	}

	const getOrgTypeLabel = (type: string) => {
		const types: Record<string, string> = {
			embassy: t("dashboard.settings.orgTypes.embassy"),
			high_representation: t("dashboard.settings.orgTypes.highRepresentation"),
			general_consulate: t("dashboard.settings.orgTypes.generalConsulate"),
			high_commission: t("dashboard.settings.orgTypes.highCommission"),
			permanent_mission: t("dashboard.settings.orgTypes.permanentMission"),
			third_party: t("dashboard.settings.orgTypes.thirdParty"),
		};
		return types[type] || type;
	};

	const GROUPS: SettingsTabGroup[] = [
		// ──  ORGANISME (admin seulement) ──
		...(canViewOrgSettings
			? [{
				label: "Organisme",
				tabs: [
					{
						id: "profile",
						label: "Profil & Identité",
						icon: <Building2 className="size-4" />,
					},
					{
						id: "hours",
						label: "Horaires & Accueil",
						icon: <Clock className="size-4" />,
					},
					{
						id: "services",
						label: "Services",
						icon: <Briefcase className="size-4" />,
					},
					{
						id: "requestProcessing",
						label: "Traitement",
						icon: <Settings2 className="size-4" />,
					},
					{
						id: "team",
						label: "Équipe",
						icon: <Users className="size-4" />,
					},
					{
						id: "payments",
						label: "Paiements",
						icon: <CreditCard className="size-4" />,
					},
					...(canDo("meetings.manage")
						? [{
							id: "communications",
							label: "Communications",
							icon: <Phone className="size-4" />,
						}]
						: []),
				],
			}]
			: []),
		// ──  MON ESPACE (tous) ──
		{
			label: "Mon espace",
			tabs: [
				{
					id: "preferences",
					label: "Notifications",
					icon: <Bell className="size-4" />,
				},
				{
					id: "appearance",
					label: "Apparence",
					icon: <Palette className="size-4" />,
				},
				// Onglet signature — seulement pour les agents habilités à signer
				// des documents officiels (Consul Général, Consul, Vice-Consul…).
				...(canDo("documents.sign")
					? [{
						id: "signature",
						label: "Signature officielle",
						icon: <FileSignature className="size-4" />,
					}]
					: []),
			],
		},
		// ──  COMPTE (tous) ──
		{
			label: "Compte",
			tabs: [
				{
					id: "accountSecurity",
					label: "Sécurité",
					icon: <KeyRound className="size-4" />,
				},
			],
		},
	];

	return (
		<>
			<SettingsLayout
				title={t("dashboard.settings.title")}
				description={t("dashboard.settings.description")}
				groups={GROUPS}
				activeTab={activeTab}
				onTabChange={setActiveTab}
			>
				<div className="flex justify-end mb-6">
					{canManageSettings &&
						!isEditing &&
						activeTab in { profile: 1, hours: 1, requestProcessing: 1 } && (
							<Button onClick={handleEdit}>
								<Edit className="mr-2 h-4 w-4" />
								{t("dashboard.settings.edit")}
							</Button>
						)}
					{isEditing && (
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								type="button"
								onClick={() => setIsEditing(false)}
							>
								<X className="mr-2 h-4 w-4" />
								{t("common.cancel")}
							</Button>
							<Button type="submit" form="settings-form">
								<Save className="mr-2 h-4 w-4" />
								{t("dashboard.settings.save")}
							</Button>
						</div>
					)}
				</div>

				<form
					id="settings-form"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					{/* Org Settings */}
					{canViewOrgSettings && (
						<>
							<div
								className={cn(
									"space-y-8 animate-in fade-in duration-300",
									activeTab !== "profile" && "hidden",
								)}
							>
								<div>
									<SettingsSectionHeader
										title={t("dashboard.settings.orgProfile")}
										description={t("dashboard.settings.orgProfileDescription")}
									/>
									<div className="max-w-2xl px-1">
										<FieldGroup>
											{isEditing ? (
												<>
													<form.Field
														name="name"
														children={(field) => {
															const isInvalid =
																field.state.meta.isTouched &&
																!field.state.meta.isValid;
															return (
																<Field data-invalid={isInvalid}>
																	<FieldLabel htmlFor={field.name}>
																		{t("dashboard.settings.name")}
																	</FieldLabel>
																	<Input
																		id={field.name}
																		value={field.state.value}
																		onBlur={field.handleBlur}
																		onChange={(e) =>
																			field.handleChange(e.target.value)
																		}
																	/>
																	{isInvalid && (
																		<FieldError
																			errors={field.state.meta.errors}
																		/>
																	)}
																</Field>
															);
														}}
													/>
													<div>
														<FieldLabel>
															{t("dashboard.settings.type")}
														</FieldLabel>
														<Badge variant="secondary">
															{getOrgTypeLabel(org.type)}
														</Badge>
													</div>
													<form.Field
														name="description"
														children={(field) => {
															const isInvalid =
																field.state.meta.isTouched &&
																!field.state.meta.isValid;
															return (
																<Field data-invalid={isInvalid}>
																	<FieldLabel htmlFor={field.name}>
																		{t("dashboard.settings.descriptionLabel")}
																	</FieldLabel>
																	<Textarea
																		id={field.name}
																		value={field.state.value}
																		onBlur={field.handleBlur}
																		onChange={(e) =>
																			field.handleChange(e.target.value)
																		}
																		rows={3}
																	/>
																	{isInvalid && (
																		<FieldError
																			errors={field.state.meta.errors}
																		/>
																	)}
																</Field>
															);
														}}
													/>
												</>
											) : (
												<>
													<div>
														<p className="text-sm text-muted-foreground">
															{t("dashboard.settings.name")}
														</p>
														<p className="font-medium">{org.name}</p>
													</div>
													<div>
														<p className="text-sm text-muted-foreground">
															{t("dashboard.settings.type")}
														</p>
														<Badge variant="secondary">
															{getOrgTypeLabel(org.type)}
														</Badge>
													</div>
													{org.description && (
														<div>
															<p className="text-sm text-muted-foreground">
																{t("dashboard.settings.descriptionLabel")}
															</p>
															<p className="text-sm">{org.description}</p>
														</div>
													)}
												</>
											)}
										</FieldGroup>
									</div>
								</div>

								<div className="mt-8">
									<SettingsSectionHeader
										title={t("dashboard.settings.address")}
									/>
									<div className="max-w-2xl px-1">
										<FieldGroup>
											{isEditing ? (
												<>
													<form.Field
														name="street"
														children={(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{t("dashboard.settings.street")}
																</FieldLabel>
																<Input
																	id={field.name}
																	value={field.state.value}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																/>
															</Field>
														)}
													/>
													<form.Field
														name="city"
														children={(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{t("dashboard.settings.city")}
																</FieldLabel>
																<Input
																	id={field.name}
																	value={field.state.value}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																/>
															</Field>
														)}
													/>
													<form.Field
														name="postalCode"
														children={(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{t("dashboard.settings.postalCode")}
																</FieldLabel>
																<Input
																	id={field.name}
																	value={field.state.value}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																/>
															</Field>
														)}
													/>
													<form.Field
														name="country"
														children={(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{t("dashboard.settings.country")}
																</FieldLabel>
																<Input
																	id={field.name}
																	value={field.state.value}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																/>
															</Field>
														)}
													/>
												</>
											) : org.address ? (
												<>
													{org.address.street && <p>{org.address.street}</p>}
													<p>
														{org.address.city}
														{org.address.postalCode &&
															`, ${org.address.postalCode}`}
													</p>
													<p>{org.address.country}</p>
												</>
											) : (
												<p className="text-muted-foreground">
													{t("dashboard.settings.noAddress")}
												</p>
											)}
										</FieldGroup>
									</div>
								</div>

								<div className="mt-8">
									<SettingsSectionHeader
										title={t("dashboard.settings.contact")}
									/>
									<div className="max-w-2xl px-1">
										<FieldGroup>
											{isEditing ? (
												<>
													<form.Field
														name="phone"
														children={(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{t("dashboard.settings.phone")}
																</FieldLabel>
																<Input
																	id={field.name}
																	value={field.state.value}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																/>
															</Field>
														)}
													/>
													<form.Field
														name="email"
														children={(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{t("dashboard.settings.email")}
																</FieldLabel>
																<Input
																	id={field.name}
																	type="email"
																	value={field.state.value}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																/>
															</Field>
														)}
													/>
													<form.Field
														name="website"
														children={(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{t("dashboard.settings.website")}
																</FieldLabel>
																<Input
																	id={field.name}
																	value={field.state.value}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																/>
															</Field>
														)}
													/>
												</>
											) : (
												<>
													{org.phone && (
														<div className="flex items-center gap-2">
															<Phone className="h-4 w-4 text-muted-foreground" />
															<span>{org.phone}</span>
														</div>
													)}
													{org.email && (
														<div className="flex items-center gap-2">
															<Mail className="h-4 w-4 text-muted-foreground" />
															<span>{org.email}</span>
														</div>
													)}
													{org.website && (
														<div className="flex items-center gap-2">
															<Globe className="h-4 w-4 text-muted-foreground" />
															<a
																href={org.website}
																target="_blank"
																rel="noopener noreferrer"
																className="text-primary hover:underline"
															>
																{org.website}
															</a>
														</div>
													)}
													{!org.phone && !org.email && !org.website && (
														<p className="text-muted-foreground">
															{t("dashboard.settings.noContact")}
														</p>
													)}
												</>
											)}
										</FieldGroup>
									</div>
								</div>
							</div>

							<div
								className={cn(
									"space-y-8 animate-in fade-in duration-300",
									activeTab !== "hours" && "hidden",
								)}
							>
								<div>
									<SettingsSectionHeader
										title={t("dashboard.settings.workingHours")}
									/>
									<div className="max-w-2xl px-1">
										{isEditing ? (
											<div className="space-y-4">
												<form.Field
													name="appointmentBuffer"
													children={(field) => (
														<div className="flex items-center gap-4 max-w-sm">
															<FieldLabel className="whitespace-nowrap">
																{t("dashboard.settings.appointmentBuffer")}
															</FieldLabel>
															<Input
																type="number"
																min="0"
																value={field.state.value}
																onChange={(e) =>
																	field.handleChange(Number(e.target.value))
																}
																className="w-24"
															/>
															<span className="text-sm text-muted-foreground">
																min
															</span>
														</div>
													)}
												/>

												<div className="grid gap-4">
													{DAYS_OF_WEEK.map((day) => (
														<div
															key={day}
															className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 border rounded-lg"
														>
															<div className="w-32 font-medium capitalize">
																{t(`dashboard.settings.days.${day}`)}
															</div>
															<form.Field
																name={`workingHours.${day}` as any}
																children={(field) => {
																	const slots =
																		(field.state.value as any[]) || [];
																	return (
																		<div className="flex-1 space-y-2">
																			{slots.map((slot: any, index: number) => (
																				<div
																					key={index}
																					className="flex items-center gap-2"
																				>
																					<Input
																						type="time"
																						value={slot.start}
																						onChange={(e) => {
																							const newSlots = [...slots];
																							newSlots[index] = {
																								...slot,
																								start: e.target.value,
																							};
																							field.handleChange(
																								newSlots as any,
																							);
																						}}
																						className="w-32"
																					/>
																					<span>-</span>
																					<Input
																						type="time"
																						value={slot.end}
																						onChange={(e) => {
																							const newSlots = [...slots];
																							newSlots[index] = {
																								...slot,
																								end: e.target.value,
																							};
																							field.handleChange(
																								newSlots as any,
																							);
																						}}
																						className="w-32"
																					/>
																					<Button
																						variant="ghost"
																						size="icon"
																						type="button"
																						onClick={() => {
																							const newSlots = slots.filter(
																								(_, i) => i !== index,
																							);
																							field.handleChange(
																								newSlots as any,
																							);
																						}}
																					>
																						<Trash2 className="h-4 w-4 text-destructive" />
																					</Button>
																				</div>
																			))}
																			<Button
																				variant="outline"
																				size="sm"
																				type="button"
																				onClick={() => {
																					field.handleChange([
																						...slots,
																						{
																							start: "09:00",
																							end: "17:00",
																							isOpen: true,
																						},
																					] as any);
																				}}
																			>
																				<Plus className="mr-2 h-4 w-4" />
																				{t("dashboard.settings.addSlot")}
																			</Button>
																		</div>
																	);
																}}
															/>
														</div>
													))}
												</div>
											</div>
										) : (
											<div className="grid gap-2">
												<div className="flex gap-2 text-sm text-muted-foreground mb-2">
													<span>
														{t("dashboard.settings.appointmentBuffer")}:
													</span>
													<span className="font-medium text-foreground">
														{org.settings?.appointmentBuffer || 30} min
													</span>
												</div>
												{DAYS_OF_WEEK.map((day) => {
													const slots = org.settings?.workingHours?.[day] || [];
													return (
														<div
															key={day}
															className="flex justify-between items-center py-2 border-b last:border-0"
														>
															<span className="capitalize">
																{t(`dashboard.settings.days.${day}`)}
															</span>
															<div className="text-right">
																{slots.length > 0 ? (
																	slots.map((slot: any, idx: number) => (
																		<div key={idx} className="text-sm">
																			{slot.start} - {slot.end}
																		</div>
																	))
																) : (
																	<span className="text-sm text-muted-foreground">
																		{t("dashboard.settings.closed")}
																	</span>
																)}
															</div>
														</div>
													);
												})}
											</div>
										)}
									</div>
								</div>
							</div>

							<div
								className={cn(
									"space-y-8 animate-in fade-in duration-300",
									activeTab !== "requestProcessing" && "hidden",
								)}
							>
								<div>
									<SettingsSectionHeader
										title={t("dashboard.settings.requestProcessing.title")}
										description={t(
											"dashboard.settings.requestProcessing.description",
										)}
									/>
									<div className="max-w-2xl px-1">
										<FieldGroup>
											{isEditing ? (
												<div className="space-y-4">
													{/* Assignment mode */}
													<form.Field
														name="requestAssignment"
														children={(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{t(
																		"dashboard.settings.requestProcessing.assignmentMode",
																	)}
																</FieldLabel>
																<Select
																	value={field.state.value}
																	onValueChange={(val) =>
																		field.handleChange(val)
																	}
																>
																	<SelectTrigger>
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="manual">
																			{t(
																				"dashboard.settings.requestProcessing.manual",
																			)}
																		</SelectItem>
																		<SelectItem value="auto">
																			{t(
																				"dashboard.settings.requestProcessing.auto",
																			)}
																		</SelectItem>
																	</SelectContent>
																</Select>
																<p className="text-xs text-muted-foreground">
																	{field.state.value === "auto"
																		? t(
																				"dashboard.settings.requestProcessing.autoDesc",
																			)
																		: t(
																				"dashboard.settings.requestProcessing.manualDesc",
																			)}
																</p>
															</Field>
														)}
													/>

													{/* Default processing days */}
													<form.Field
														name="defaultProcessingDays"
														children={(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{t(
																		"dashboard.settings.requestProcessing.processingDays",
																	)}
																</FieldLabel>
																<div className="flex items-center gap-2">
																	<Input
																		id={field.name}
																		type="number"
																		min={1}
																		max={365}
																		value={field.state.value}
																		onChange={(e) =>
																			field.handleChange(Number(e.target.value))
																		}
																		className="w-24"
																	/>
																	<span className="text-sm text-muted-foreground">
																		{t(
																			"dashboard.settings.requestProcessing.days",
																		)}
																	</span>
																</div>
															</Field>
														)}
													/>

													{/* AI Analysis toggle */}
													<form.Field
														name="aiAnalysisEnabled"
														children={(field) => (
															<div className="flex items-center justify-between">
																<div className="space-y-0.5">
																	<Label className="flex items-center gap-2">
																		<Bot className="h-4 w-4" />
																		{t(
																			"dashboard.settings.requestProcessing.aiAnalysis",
																		)}
																	</Label>
																	<p className="text-xs text-muted-foreground">
																		{t(
																			"dashboard.settings.requestProcessing.aiAnalysisDesc",
																		)}
																	</p>
																</div>
																<Switch
																	checked={field.state.value}
																	onCheckedChange={(checked) =>
																		field.handleChange(checked)
																	}
																/>
															</div>
														)}
													/>
												</div>
											) : (
												<div className="space-y-3">
													<div className="flex justify-between items-center">
														<span className="text-sm text-muted-foreground">
															{t(
																"dashboard.settings.requestProcessing.assignmentMode",
															)}
														</span>
														<Badge variant="secondary">
															{org.settings?.requestAssignment === "auto"
																? t("dashboard.settings.requestProcessing.auto")
																: t(
																		"dashboard.settings.requestProcessing.manual",
																	)}
														</Badge>
													</div>
													<div className="flex justify-between items-center">
														<span className="text-sm text-muted-foreground">
															{t(
																"dashboard.settings.requestProcessing.processingDays",
															)}
														</span>
														<span className="font-medium text-sm">
															{org.settings?.defaultProcessingDays || 15}{" "}
															{t("dashboard.settings.requestProcessing.days")}
														</span>
													</div>
													<div className="flex justify-between items-center">
														<span className="text-sm text-muted-foreground flex items-center gap-1">
															<Bot className="h-3.5 w-3.5" />
															{t(
																"dashboard.settings.requestProcessing.aiAnalysis",
															)}
														</span>
														<Badge
															variant={
																org.settings?.aiAnalysisEnabled !== false
																	? "default"
																	: "outline"
															}
														>
															{org.settings?.aiAnalysisEnabled !== false
																? t("common.enabled")
																: t("common.disabled")}
														</Badge>
													</div>
												</div>
											)}
										</FieldGroup>
									</div>
								</div>
							</div>
						</>
					)}
				</form>

				{/* ─── Services Tab (embedded from services page) ─── */}
				{canViewOrgSettings && (
					<div
						className={cn(
							"animate-in fade-in duration-300",
							activeTab !== "services" && "hidden",
						)}
					>
						<ServicesSettingsPanel />
					</div>
				)}

	
				{/* ─── Équipe Tab ─── */}
				{canViewOrgSettings && (
					<div
						id="settings-tab-team"
						className={cn(
							"animate-in fade-in duration-300",
							activeTab !== "team" && "hidden",
						)}
					>
						<div className="space-y-6">
							<div>
								<h3 className="text-lg font-semibold flex items-center gap-2">
									<Users className="h-5 w-5 text-primary" />
									Organigramme &amp; Équipe
								</h3>
								<p className="text-sm text-muted-foreground mt-1">
									Gérez les membres de votre équipe, leurs rôles et l&apos;organigramme de votre organisme.
								</p>
							</div>
							<div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
											<Users className="h-5 w-5 text-primary" />
										</div>
										<div>
											<p className="font-medium text-sm">Page Équipe complète</p>
											<p className="text-xs text-muted-foreground">Organigramme interactif, gestion des membres et des rôles</p>
										</div>
									</div>
									<Link
										href="/team"
										id="settings-link-team"
										className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
									>
										Ouvrir iÉquipe
									</Link>
								</div>
								<div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
									{[
										{ label: "Membres actifs", color: "text-emerald-500" },
										{ label: "Rôles assignés", color: "text-blue-500" },
										{ label: "En attente", color: "text-amber-500" },
									].map((item) => (
										<div key={item.label} className="text-center p-3 rounded-lg bg-muted/30">
											<p className={`text-2xl font-bold ${item.color}`}>—</p>
											<p className="text-xs text-muted-foreground mt-1">{item.label}</p>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* ─── Paiements Tab ─── */}
				{canViewOrgSettings && (
					<div
						id="settings-tab-payments"
						className={cn(
							"animate-in fade-in duration-300",
							activeTab !== "payments" && "hidden",
						)}
					>
						<div className="space-y-6">
							<div>
								<h3 className="text-lg font-semibold flex items-center gap-2">
									<CreditCard className="h-5 w-5 text-primary" />
									Suivi des Paiements
								</h3>
								<p className="text-sm text-muted-foreground mt-1">
									Consultez l&apos;historique des transactions et configurez les paramètres de paiement.
								</p>
							</div>
							<div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
											<CreditCard className="h-5 w-5 text-green-600" />
										</div>
										<div>
											<p className="font-medium text-sm">Tableau de bord Paiements</p>
											<p className="text-xs text-muted-foreground">Revenus, transactions et répartition des statuts</p>
										</div>
									</div>
									<Link
										href="/payments"
										id="settings-link-payments"
										className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
									>
										Voir les paiements
									</Link>
								</div>
								<div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
									{[
										{ label: "Revenus totaux", color: "text-green-600" },
										{ label: "Transactions", color: "text-blue-600" },
										{ label: "Taux de succès", color: "text-emerald-600" },
									].map((item) => (
										<div key={item.label} className="text-center p-3 rounded-lg bg-muted/30">
											<p className={`text-2xl font-bold ${item.color}`}>—</p>
											<p className="text-xs text-muted-foreground mt-1">{item.label}</p>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* ─── Communications Tab ─── */}
				{canViewOrgSettings && activeOrgId && (
					<div
						id="settings-tab-communications"
						className={cn(
							"animate-in fade-in duration-300",
							activeTab !== "communications" && "hidden",
						)}
					>
						<CallLinesSettings orgId={activeOrgId} />
					</div>
				)}

				{/* ─── Personal settings (visible to everyone) ─── */}


				<div
					className={cn(
						"space-y-8 animate-in fade-in duration-300",
						activeTab !== "preferences" && "hidden",
					)}
				>
					{activeOrgId && <MemberPreferencesCard orgId={activeOrgId} />}
				</div>

				{/* Onglet Signature officielle (permission documents.sign) */}
				<div
					className={cn(
						"animate-in fade-in duration-300",
						activeTab !== "signature" && "hidden",
					)}
				>
					<SignatureSettingsCard />
				</div>

				<div
					className={cn(
						"animate-in fade-in duration-300",
						activeTab !== "accountSecurity" && "hidden",
					)}
				>
					{/* User account info */}
					<SettingsSectionHeader
						title={t("settings.security.accountInfo")}
						description={t("settings.security.accountInfoDesc")}
					/>
					<div>
						<SettingsRow
							title={t("common.name")}
							value={session?.user?.name || "—"}
						/>
						<SettingsRow
							title={t("common.email")}
							value={session?.user?.email || "—"}
						/>
					</div>

					<SettingsDivider />

					{/* Password section */}
					<div className="max-w-2xl">
						<SettingsSectionHeader
							title={t("settings.security.changePassword")}
							description={t("settings.security.changePasswordDesc")}
						/>
						<div className="max-w-md space-y-3">
							{resetError && (
								<div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{resetError}
								</div>
							)}
							{resetSuccess && (
								<div className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-sm text-primary flex items-center gap-2">
									<Check className="size-4" />
									{t("settings.security.resetSuccess")}
								</div>
							)}

							{resetStep === "idle" && (
								<Button
									variant="outline"
									onClick={handleSendResetOtp}
									disabled={resetLoading || !session?.user?.email}
								>
									{resetLoading ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : (
										<Mail className="mr-2 size-4" />
									)}
									{t("settings.security.sendResetCode")}
								</Button>
							)}

							{resetStep === "otp_sent" && (
								<form onSubmit={handleResetWithOtp} className="space-y-4">
									<p className="text-sm text-muted-foreground">
										{t("settings.security.otpSentTo", {
											email: session?.user?.email,
										})}
									</p>
									<div className="space-y-2">
										<Label>{t("settings.security.otpCode")}</Label>
										<Input
											value={resetOtp}
											onChange={(e) => setResetOtp(e.target.value)}
											placeholder="123456"
											required
											autoComplete="one-time-code"
										/>
									</div>
									<div className="space-y-2">
										<Label>{t("settings.security.newPassword")}</Label>
										<Input
											type="password"
											value={resetNewPassword}
											onChange={(e) => setResetNewPassword(e.target.value)}
											required
											minLength={8}
											autoComplete="new-password"
										/>
									</div>
									<div className="space-y-2">
										<Label>{t("settings.security.confirmPassword")}</Label>
										<Input
											type="password"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											required
											minLength={8}
											autoComplete="new-password"
										/>
									</div>
									<div className="flex gap-2">
										<Button
											type="submit"
											disabled={
												resetLoading ||
												!resetOtp ||
												!resetNewPassword ||
												!confirmPassword ||
												resetNewPassword !== confirmPassword
											}
										>
											{resetLoading && (
												<Loader2 className="mr-2 size-4 animate-spin" />
											)}
											{t("settings.security.resetPassword")}
										</Button>
										<Button
											type="button"
											variant="ghost"
											onClick={() => {
												setResetStep("idle");
												setResetError(null);
												setResetOtp("");
												setResetNewPassword("");
												setConfirmPassword("");
											}}
										>
											{t("common.cancel")}
										</Button>
									</div>
								</form>
							)}
						</div>
					</div>

					<SettingsDivider />

					{/* PIN Code section */}
					<PinCodeSection />

					<SettingsDivider />

					{/* Logout section */}
					<SettingsSectionHeader
						title={t("settings.account.title")}
						description={t("settings.account.description")}
					/>
					<div>
						<SettingsRow
							title={t("common.logout")}
							description={t(
								"common.logoutConfirmDescription",
								"Vous allez être déconnecté de votre session.",
							)}
							action={
								<Button
									variant="destructive"
									type="button"
									onClick={() => setShowLogoutDialog(true)}
								>
									<LogOut className="mr-2 h-4 w-4" />
									{t("common.logout")}
								</Button>
							}
						/>
					</div>
				</div>

				<div
					className={cn(
						"space-y-8 animate-in fade-in duration-300",
						activeTab !== "appearance" && "hidden",
					)}
				>
					<div>
						<SettingsSectionHeader
							title={t("settings.display.title")}
							description={t("settings.display.description")}
						/>
						<DarkModeToggle />
					</div>

					<div className="mt-8">
						<SettingsSectionHeader
							title={t("settings.consularTheme.title")}
							description={t("settings.consularTheme.description")}
						/>
						<ThemeSwitcher />
					</div>
				</div>
			</SettingsLayout>

			<AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("common.logoutConfirmTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t(
								"common.logoutConfirmDescription",
								"Vous allez être déconnecté de votre session. Vous devrez vous reconnecter pour accéder à votre espace.",
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								await authClient.signOut();
								window.location.href = "/";
							}}
						>
							{t("common.logout")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

/* -------------------------------------------------- */
/*  Dark Mode Toggle                                  */
/* -------------------------------------------------- */
function DarkModeToggle() {
	const { t } = useTranslation();
	const { theme, setTheme } = useTheme();
	return (
		<div className="flex items-center justify-between">
			<div className="space-y-0.5">
				<label className="text-sm font-medium">
					{t("settings.display.darkMode")}
				</label>
				<p className="text-sm text-muted-foreground">
					{t("settings.display.darkModeDesc")}
				</p>
			</div>
			<Switch
				checked={theme === "dark"}
				onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
			/>
		</div>
	);
}

/* -------------------------------------------------- */
/*  Theme Switcher (Classique / Homorphisme)           */
/* -------------------------------------------------- */
function ThemePreview({
	themeId,
	label,
	description,
	isActive,
	onClick,
}: {
	themeId: ConsularTheme;
	label: string;
	description: string;
	isActive: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer w-full text-left",
				isActive
					? "border-primary bg-primary/5 ring-2 ring-primary/20"
					: "border-border hover:border-muted-foreground/30 hover:bg-muted/30",
			)}
		>
			<div
				className={cn(
					"w-16 h-12 rounded-lg overflow-hidden relative shrink-0",
					themeId === "default"
						? "bg-card border border-border"
						: "bg-[oklch(0.92_0.005_250)]",
				)}
			>
				{themeId === "default" ? (
					<div className="p-1.5 space-y-1">
						<div className="h-1.5 w-5 bg-primary/20 rounded" />
						<div className="h-2.5 bg-muted rounded border border-border" />
						<div className="flex gap-0.5">
							<div className="h-2 flex-1 bg-muted rounded border border-border" />
							<div className="h-2 flex-1 bg-muted rounded border border-border" />
						</div>
					</div>
				) : (
					<div className="p-1.5 space-y-1">
						<div className="h-1.5 w-5 bg-primary/20 rounded" />
						<div className="h-2.5 rounded neu-preview-element" />
						<div className="flex gap-0.5">
							<div className="h-2 flex-1 rounded neu-preview-element" />
							<div className="h-2 flex-1 rounded neu-preview-element" />
						</div>
					</div>
				)}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold">{label}</p>
				<p className="text-xs text-muted-foreground leading-tight truncate">
					{description}
				</p>
			</div>
			{isActive && <div className="w-3 h-3 rounded-full bg-primary shrink-0" />}
		</button>
	);
}

/* -------------------------------------------------- */
/*  Member Preferences Card                           */
/* -------------------------------------------------- */
function MemberPreferencesCard({ orgId }: { orgId: string }) {
	const { t } = useTranslation();

	const { data: memberSettings } = useAuthenticatedConvexQuery(
		api.functions.userPreferences.getMyMembershipSettings,
		{ orgId: orgId as any },
	);
	const { mutateAsync: updateSettings } = useConvexMutationQuery(
		api.functions.userPreferences.updateMyMembershipSettings,
	);

	const handleToggle = async (key: string, value: boolean) => {
		try {
			await updateSettings({
				orgId: orgId as any,
				[key]: value,
			});
			toast.success(t("settings.memberPreferences.updateSuccess"));
		} catch {
			toast.error(t("settings.memberPreferences.updateError"));
		}
	};

	if (memberSettings === undefined) {
		return (
			<div className="py-6 border rounded-xl bg-card p-6">
				<Skeleton className="h-[120px]" />
			</div>
		);
	}

	if (memberSettings === null) return null;

	const settings = memberSettings.settings;

	const toggleItems = [
		{
			key: "notifyOnNewRequest",
			label: t("settings.memberPreferences.notifyOnNewRequest"),
			desc: t("settings.memberPreferences.notifyOnNewRequestDesc"),
			value: settings.notifyOnNewRequest ?? true,
		},
		{
			key: "notifyOnAssignment",
			label: t("settings.memberPreferences.notifyOnAssignment"),
			desc: t("settings.memberPreferences.notifyOnAssignmentDesc"),
			value: settings.notifyOnAssignment ?? true,
		},
		{
			key: "dailyDigest",
			label: t("settings.memberPreferences.dailyDigest"),
			desc: t("settings.memberPreferences.dailyDigestDesc"),
			value: settings.dailyDigest ?? false,
		},
	];

	return (
		<div>
			<SettingsSectionHeader
				title={t("settings.memberPreferences.title")}
				description={t("settings.memberPreferences.description")}
			/>
			<div className="space-y-0 max-w-xl">
				{toggleItems.map((item) => (
					<div
						key={item.key}
						className="flex items-center justify-between py-4 border-b last:border-0"
					>
						<div className="space-y-0.5">
							<Label className="text-sm font-medium">{item.label}</Label>
							<p className="text-xs text-muted-foreground">{item.desc}</p>
						</div>
						<Switch
							checked={item.value}
							onCheckedChange={(checked) => handleToggle(item.key, checked)}
						/>
					</div>
				))}
			</div>
		</div>
	);
}

function ThemeSwitcher() {
	const { t } = useTranslation();
	const { consularTheme, setConsularTheme } = useConsularTheme();
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<ThemePreview
				themeId="default"
				label={t("settings.consularTheme.default")}
				description={t("settings.consularTheme.defaultDesc")}
				isActive={consularTheme === "default"}
				onClick={() => setConsularTheme("default")}
			/>
			<ThemePreview
				themeId="homeomorphism"
				label={t("settings.consularTheme.homeomorphism")}
				description={t("settings.consularTheme.homeomorphismDesc")}
				isActive={consularTheme === "homeomorphism"}
				onClick={() => setConsularTheme("homeomorphism")}
			/>
		</div>
	);
}

/* -------------------------------------------------- */
/*  Services Settings Panel (embedded in Settings)     */
/* -------------------------------------------------- */
function ServicesSettingsPanel() {
	const { t, i18n } = useTranslation();
	const { activeOrgId } = useOrg();

	const [searchQuery, setSearchQuery] = useState("");
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [selectedService, setSelectedService] = useState<string>("");
	const [activationForm, setActivationForm] = useState({
		fee: 0,
		currency: "EUR",
		requiresAppointment: false,
		requiresAppointmentForPickup: false,
		instructions: "",
	});

	// ── Queries ──
	const { data: catalogServices } = useAuthenticatedConvexQuery(
		api.functions.services.listCatalog,
		{},
	);
	const { data: orgServices } = useAuthenticatedConvexQuery(
		api.functions.services.listByOrg,
		activeOrgId ? { orgId: activeOrgId, activeOnly: false } : "skip",
	);

	// ── Mutations ──
	const { mutateAsync: toggleActive } = useConvexMutationQuery(
		api.functions.services.toggleOrgServiceActive,
	);
	const { mutateAsync: activateService } = useConvexMutationQuery(
		api.functions.services.activateForOrg,
	);

	// ── Merge catalog + org services ──
	const mergedServices = useMemo(() => {
		if (!catalogServices) return [];
		const orgMap = new Map((orgServices ?? []).map((os: any) => [os.serviceId, os]));
		return catalogServices.map((cs: any) => {
			const os = orgMap.get(cs._id) as any;
			let activationState: "active" | "inactive" | "not_activated" = "not_activated";
			if (os) {
				activationState = os.isActive ? "active" : "inactive";
			}
			return {
				catalogId: cs._id,
				slug: cs.slug,
				name: cs.name,
				description: cs.description,
				category: cs.category,
				icon: cs.icon,
				estimatedDays: cs.estimatedDays,
				requiresAppointment: cs.requiresAppointment,
				activationState,
				orgServiceId: os?._id,
				pricing: os?.pricing as { amount: number; currency: string } | undefined,
				isActive: os?.isActive,
			};
		});
	}, [catalogServices, orgServices]);

	const availableForActivation = mergedServices.filter(
		(s: any) => s.activationState === "not_activated",
	);

	// ── Filtering ──
	const filteredServices = useMemo(() => {
		const query = searchQuery.toLowerCase().trim();
		return mergedServices.filter((service: any) => {
			const name = typeof service.name === "string" ? service.name : (service.name?.[i18n.language] || service.name?.fr || service.name?.en || "");
			const desc = typeof service.description === "string" ? service.description : (service.description?.[i18n.language] || service.description?.fr || service.description?.en || "");
			return !query || name.toLowerCase().includes(query) || desc.toLowerCase().includes(query);
		});
	}, [mergedServices, searchQuery, i18n.language]);

	// ── Handlers ──
	const handleToggle = async (service: any) => {
		if (!service.orgServiceId) return;
		try {
			await toggleActive({ orgServiceId: service.orgServiceId as any });
			toast.success(t("dashboard.services.statusUpdated"));
		} catch {
			toast.error(t("dashboard.services.updateError"));
		}
	};

	const handleActivateService = async () => {
		if (!selectedService || !activeOrgId) return;
		try {
			await activateService({
				orgId: activeOrgId,
				serviceId: selectedService as any,
				pricing: { amount: activationForm.fee, currency: activationForm.currency },
				requiresAppointment: activationForm.requiresAppointment,
				requiresAppointmentForPickup: activationForm.requiresAppointmentForPickup,
			});
			toast.success(t("dashboard.services.activated"));
			setAddDialogOpen(false);
			setSelectedService("");
			setActivationForm({ fee: 0, currency: "EUR", requiresAppointment: false, requiresAppointmentForPickup: false, instructions: "" });
		} catch (error: any) {
			toast.error(error.message || t("dashboard.services.updateError"));
		}
	};

	if (!catalogServices) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="size-8 animate-spin text-primary" />
			</div>
		);
	}

	const activeCount = mergedServices.filter((s: any) => s.activationState === "active").length;
	const totalCount = mergedServices.length;

	return (
		<>
			<SettingsSectionHeader
				title="Services"
				description={t("dashboard.services.description", "Gérez les services disponibles pour votre organisme. Activez ou désactivez les services du catalogue.")}
			/>

			{/* Stats row */}
			<div className="flex items-center gap-4 mb-6">
				<div className="flex items-center gap-2 text-sm">
					<div className="size-2 rounded-full bg-green-500" />
					<span className="text-muted-foreground">{activeCount} {t("dashboard.services.status.active", "actifs")}</span>
				</div>
				<div className="flex items-center gap-2 text-sm">
					<div className="size-2 rounded-full bg-muted-foreground/30" />
					<span className="text-muted-foreground">{totalCount - activeCount} {t("dashboard.services.status.notActivated", "non activés")}</span>
				</div>
			</div>

			{/* Search + Add */}
			<div className="flex items-center gap-3 mb-4">
				<div className="relative flex-1">
					<input
						type="text"
						placeholder={t("dashboard.services.searchPlaceholder", "Rechercher un service...")}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background outline-none transition-all text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
					/>
					<Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
				</div>
				<Button
					onClick={() => { setSelectedService(""); setActivationForm({ fee: 0, currency: "EUR", requiresAppointment: false, requiresAppointmentForPickup: false, instructions: "" }); setAddDialogOpen(true); }}
					disabled={availableForActivation.length === 0}
					size="sm"
					className="gap-1.5 shrink-0"
				>
					<Plus className="size-4" />
					{t("dashboard.services.activate")}
				</Button>
			</div>

			{/* Services list */}
			<div className="space-y-2">
				{filteredServices.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground text-sm">
						{t("dashboard.services.empty.description", "Aucun service ne correspond à votre recherche.")}
					</div>
				) : (
					filteredServices.map((service: any) => {
						const name = typeof service.name === "string" ? service.name : (service.name?.[i18n.language] || service.name?.fr || service.name?.en || "");
						const isActivated = service.activationState !== "not_activated";
						const isActive = service.activationState === "active";

						const innerContent = (
							<>
								<div className="flex items-center gap-3 min-w-0">
									<div className={cn(
										"size-9 rounded-lg flex items-center justify-center shrink-0",
										isActive ? "bg-green-500/10 text-green-600 dark:text-green-400" :
											isActivated ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
												"bg-muted text-muted-foreground",
									)}>
										<Briefcase className="size-4" />
									</div>
									<div className="min-w-0">
										<p className="text-sm font-medium truncate">{name}</p>
										<p className="text-xs text-muted-foreground">
											{isActive ? t("dashboard.services.status.active") :
												isActivated ? t("dashboard.services.status.inactive") :
													t("dashboard.services.status.notActivated")}
											{service.pricing && isActivated && (
												<> · {service.pricing.amount === 0 ? t("services.free", "Gratuit") : `${service.pricing.amount} ${service.pricing.currency}`}</>
											)}
										</p>
									</div>
								</div>

								<div
									className="flex items-center gap-2 shrink-0"
									onClick={(e) => e.stopPropagation()}
								>
									{isActivated ? (
										<Switch
											checked={isActive}
											onCheckedChange={() => handleToggle(service)}
										/>
									) : (
										<Button
											variant="outline"
											size="sm"
											className="text-xs gap-1"
											onClick={() => { setSelectedService(service.catalogId); setAddDialogOpen(true); }}
										>
											<Plus className="size-3" />
											{t("dashboard.services.activate")}
										</Button>
									)}
								</div>
							</>
						);

						// Quand le service est activé pour l'org, la ligne entière
						// ouvre l'éditeur — le Switch/Button reste cliquable via
						// stopPropagation.
						if (isActivated && service.orgServiceId) {
							return (
								<Link
									key={service.catalogId}
									href={`/services/${service.orgServiceId}/edit`}
									className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border bg-card transition-colors hover:bg-muted/40"
								>
									{innerContent}
								</Link>
							);
						}

						return (
							<div
								key={service.catalogId}
								className={cn(
									"flex items-center justify-between gap-4 px-4 py-3 rounded-xl border transition-colors",
									isActivated ? "bg-card" : "bg-muted/30 border-dashed",
								)}
							>
								{innerContent}
							</div>
						);
					})
				)}
			</div>

			{/* Activation Dialog */}
			<Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("dashboard.services.dialog.title")}</DialogTitle>
						<DialogDescription>
							{t("dashboard.services.dialog.description", "Sélectionnez un service du catalogue à activer pour votre organisme.")}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>{t("dashboard.services.dialog.selectService")}</Label>
							<Select value={selectedService} onValueChange={setSelectedService} disabled={!!selectedService}>
								<SelectTrigger>
									<SelectValue placeholder={t("dashboard.services.dialog.selectPlaceholder", "Choisir un service…")} />
								</SelectTrigger>
								<SelectContent>
									{availableForActivation.length === 0 ? (
										<div className="p-2 text-center text-muted-foreground">
											{t("dashboard.services.dialog.allActivated", "Tous les services sont déjà activés")}
										</div>
									) : (
										availableForActivation.map((s: any) => {
											const sName = typeof s.name === "string" ? s.name : (s.name?.[i18n.language] || s.name?.fr || s.name?.en || "");
											return <SelectItem key={s.catalogId} value={s.catalogId}>{sName}</SelectItem>;
										})
									)}
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>{t("dashboard.services.dialog.fee")}</Label>
								<Input type="number" value={activationForm.fee} onChange={(e) => setActivationForm({ ...activationForm, fee: Number(e.target.value) })} min={0} />
							</div>
							<div className="space-y-2">
								<Label>{t("dashboard.services.dialog.currency")}</Label>
								<Select value={activationForm.currency} onValueChange={(v) => setActivationForm({ ...activationForm, currency: v })}>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										<SelectItem value="EUR">EUR (€)</SelectItem>
										<SelectItem value="USD">USD ($)</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="space-y-2">
							<Label>{t("dashboard.services.dialog.instructions", "Instructions personnalisées")}</Label>
							<Textarea
								value={activationForm.instructions}
								onChange={(e) => setActivationForm({ ...activationForm, instructions: e.target.value })}
								placeholder={t("dashboard.services.dialog.instructionsPlaceholder", "Instructions spécifiques pour ce service…")}
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAddDialogOpen(false)}>{t("common.cancel")}</Button>
						<Button onClick={handleActivateService} disabled={!selectedService}>{t("dashboard.services.dialog.submit")}</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

// ─── PIN Code Section ─────────────────────────────────────
function PinCodeSection() {
	const pinStatus = useConvexQuery(api.functions.pin.getPinStatus, {});
	const createPinMut = useConvexMutation(api.functions.pin.createPin);
	const updatePinMut = useConvexMutation(api.functions.pin.updatePin);
	const deletePinMut = useConvexMutation(api.functions.pin.deletePin);
	const [mode, setMode] = useState<"idle" | "create" | "modify" | "delete">("idle");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [currentPin, setCurrentPin] = useState("");
	const [pinError, setPinError] = useState<string | null>(null);
	const [pinLoading, setPinLoading] = useState(false);
	const resetForm = () => { setMode("idle"); setNewPin(""); setConfirmPin(""); setCurrentPin(""); setPinError(null); };
	if (pinStatus === undefined) return null;
	const daysLeft = pinStatus.lastOtpVerifiedAt ? Math.max(0, Math.floor((pinStatus.lastOtpVerifiedAt + 90*24*60*60*1000 - Date.now()) / (24*60*60*1000))) : 0;
	return (
		<div>
			<SettingsSectionHeader title="Code PIN" description={pinStatus.hasPin ? `Actif depuis le ${pinStatus.pinCreatedAt ? new Date(pinStatus.pinCreatedAt).toLocaleDateString("fr-FR") : "—"}` : "Créez un code PIN pour vous connecter plus rapidement"} />
			<div className="py-3 space-y-3">
				{!pinStatus.hasPin && mode === "idle" && <Button variant="outline" onClick={() => setMode("create")} className="gap-2"><Lock className="h-4 w-4" />Créer mon code PIN</Button>}
				{pinStatus.hasPin && mode === "idle" && (
					<div className="space-y-2">
						{daysLeft > 0 && daysLeft <= 15 && <p className="text-xs text-amber-600">Vérification OTP requise dans {daysLeft} jours</p>}
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={() => setMode("modify")} className="gap-1.5"><KeyRound className="h-3.5 w-3.5" />Modifier</Button>
							<Button variant="ghost" size="sm" onClick={() => setMode("delete")} className="gap-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" />Supprimer</Button>
						</div>
					</div>
				)}
				{mode === "create" && (
					<div className="space-y-3 p-3 border rounded-lg">
						<div className="space-y-1"><label className="text-xs font-medium">Nouveau PIN (6 chiffres)</label><input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						<div className="space-y-1"><label className="text-xs font-medium">Confirmer</label><input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						{pinError && <p className="text-xs text-destructive">{pinError}</p>}
						<div className="flex gap-2"><Button size="sm" onClick={async () => { if(newPin.length!==6||newPin!==confirmPin){setPinError("Codes différents");return;} setPinLoading(true);setPinError(null);try{await createPinMut({pin:newPin});resetForm();toast.success("Code PIN créé");}catch(e:any){setPinError(e.message?.includes("OTP")?"Reconnectez-vous par OTP d'abord":(e.message??"Erreur"));}finally{setPinLoading(false);} }} disabled={pinLoading||newPin.length!==6||newPin!==confirmPin}>{pinLoading&&<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>}Enregistrer</Button><Button size="sm" variant="ghost" onClick={resetForm}>Annuler</Button></div>
					</div>
				)}
				{mode === "modify" && (
					<div className="space-y-3 p-3 border rounded-lg">
						<div className="space-y-1"><label className="text-xs font-medium">PIN actuel</label><input type="password" inputMode="numeric" maxLength={6} value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						<div className="space-y-1"><label className="text-xs font-medium">Nouveau PIN</label><input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						<div className="space-y-1"><label className="text-xs font-medium">Confirmer</label><input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="------" className="w-full h-10 text-center text-lg tracking-[0.3em] font-mono border rounded-md bg-background px-3" /></div>
						{pinError && <p className="text-xs text-destructive">{pinError}</p>}
						<div className="flex gap-2"><Button size="sm" onClick={async () => { if(newPin.length!==6||newPin!==confirmPin){setPinError("Codes différents");return;} setPinLoading(true);setPinError(null);try{await updatePinMut({currentPin,newPin});resetForm();toast.success("Code PIN modifié");}catch(e:any){setPinError(e.message?.includes("INVALID")?"PIN actuel incorrect":(e.message??"Erreur"));}finally{setPinLoading(false);} }} disabled={pinLoading}>{pinLoading&&<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>}Enregistrer</Button><Button size="sm" variant="ghost" onClick={resetForm}>Annuler</Button></div>
					</div>
				)}
				{mode === "delete" && (
					<div className="space-y-3 p-3 border border-destructive/20 rounded-lg bg-destructive/5">
						<p className="text-sm">Supprimer votre code PIN ?</p>
						{pinError && <p className="text-xs text-destructive">{pinError}</p>}
						<div className="flex gap-2"><Button size="sm" variant="destructive" onClick={async () => { setPinLoading(true);try{await deletePinMut({});resetForm();toast.success("Code PIN supprimé");}catch(e:any){setPinError(e.message??"Erreur");}finally{setPinLoading(false);} }} disabled={pinLoading}>{pinLoading&&<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>}Supprimer</Button><Button size="sm" variant="ghost" onClick={resetForm}>Annuler</Button></div>
					</div>
				)}
			</div>
		</div>
	);
}
