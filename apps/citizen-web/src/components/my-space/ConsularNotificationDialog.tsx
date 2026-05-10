import { api } from "@convex/_generated/api";
import { DetailedDocumentType, type CountryCode } from "@convex/lib/constants";
import type { Id } from "@convex/_generated/dataModel";
import {
	Building2,
	Check,
	FileCheck2,
	FileClock,
	Loader2,
	MapPin,
	Plane,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/ui/country-select";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUploader } from "@/components/common/file-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type DialogState =
	| "select_country"
	| "checking"
	| "org_found"
	| "fill_stay_info"
	| "already_in_progress"
	| "submitting"
	| "success"
	| "not_found"
	| "not_applicable"
	| "error";

type StayReason = "tourism" | "business" | "family" | "medical" | "studies" | "other";

const STAY_REASON_OPTIONS: { value: StayReason; label: string }[] = [
	{ value: "tourism", label: "Tourisme" },
	{ value: "business", label: "Affaires" },
	{ value: "family", label: "Visite familiale" },
	{ value: "medical", label: "Raisons médicales" },
	{ value: "studies", label: "Études / Formation" },
	{ value: "other", label: "Autre" },
];

const MAX_STAY_DAYS = 180;

interface ConsularNotificationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ConsularNotificationDialog({
	open,
	onOpenChange,
}: ConsularNotificationDialogProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const [dialogState, setDialogState] = useState<DialogState>("select_country");
	const [destinationCountry, setDestinationCountry] = useState<
		CountryCode | undefined
	>();
	const [orgName, setOrgName] = useState("");
	const [reference, setReference] = useState("");
	const [existingReference, setExistingReference] = useState("");
	const [errorMessage, setErrorMessage] = useState("");

	// Stay info (filled in fill_stay_info step)
	const [stayStart, setStayStart] = useState<Date | undefined>();
	const [stayEnd, setStayEnd] = useState<Date | undefined>();
	const [stayReason, setStayReason] = useState<StayReason | undefined>();
	const [stayStreet, setStayStreet] = useState("");
	const [stayCity, setStayCity] = useState("");
	const [proofDocId, setProofDocId] = useState<Id<"documents"> | undefined>();
	const [stayFormError, setStayFormError] = useState("");

	// Only query when a country is selected and we're in checking state
	const shouldQuery =
		open && dialogState === "checking" && !!destinationCountry;

	// Find the notification org for the selected destination country
	const { data: orgResult } = useAuthenticatedConvexQuery(
		api.functions.profiles.findNotificationOrg,
		shouldQuery ? { destinationCountry } : "skip",
	);

	// Mutation to submit request
	const { mutateAsync: submitRequest } = useConvexMutationQuery(
		api.functions.profiles.submitNotificationRequest,
	);

	// Process org lookup result
	useEffect(() => {
		if (!shouldQuery || !orgResult) return;

		switch (orgResult.status) {
			case "found":
				setOrgName(orgResult.orgName ?? "");
				setDialogState("org_found");
				break;
			case "already_in_progress":
				setOrgName(orgResult.orgName ?? "");
				setExistingReference(orgResult.reference ?? "");
				setDialogState("already_in_progress");
				break;
			case "not_applicable":
				setDialogState("not_applicable");
				break;
			case "no_profile":
			case "no_service":
			case "no_org_found":
				setDialogState("not_found");
				break;
			default:
				setDialogState("error");
				setErrorMessage(
					t(
						"mySpace.notification.dialog.unknownError",
						"Une erreur inconnue est survenue.",
					),
				);
		}
	}, [orgResult, shouldQuery, t]);

	// Reset state when dialog closes
	useEffect(() => {
		if (!open) {
			setDialogState("select_country");
			setDestinationCountry(undefined);
			setOrgName("");
			setReference("");
			setExistingReference("");
			setErrorMessage("");
			setStayStart(undefined);
			setStayEnd(undefined);
			setStayReason(undefined);
			setStayStreet("");
			setStayCity("");
			setProofDocId(undefined);
			setStayFormError("");
		}
	}, [open]);

	const handleCountrySelected = useCallback(() => {
		if (!destinationCountry) return;
		setDialogState("checking");
	}, [destinationCountry]);

	const handleProceedToStayForm = useCallback(() => {
		setStayFormError("");
		setDialogState("fill_stay_info");
	}, []);

	const handleSubmit = useCallback(async () => {
		if (!destinationCountry) return;
		setStayFormError("");

		// Validate stay info
		if (!stayStart || !stayEnd) {
			setStayFormError("Veuillez renseigner les dates d'arrivée et de départ.");
			return;
		}
		if (stayEnd < stayStart) {
			setStayFormError("La date de départ doit être postérieure à la date d'arrivée.");
			return;
		}
		const durationDays = Math.floor(
			(stayEnd.getTime() - stayStart.getTime()) / (24 * 60 * 60 * 1000),
		);
		if (durationDays > MAX_STAY_DAYS) {
			setStayFormError(`La durée du séjour ne peut excéder ${MAX_STAY_DAYS} jours.`);
			return;
		}
		if (!stayReason) {
			setStayFormError("Veuillez sélectionner le motif du séjour.");
			return;
		}
		if (!stayStreet.trim() || !stayCity.trim()) {
			setStayFormError("Veuillez renseigner l'adresse de séjour (rue et ville).");
			return;
		}
		if (!proofDocId) {
			setStayFormError("Veuillez joindre un justificatif de séjour.");
			return;
		}

		setDialogState("submitting");
		try {
			const result = await submitRequest({
				destinationCountry,
				stayStartDate: stayStart.getTime(),
				stayEndDate: stayEnd.getTime(),
				stayReason,
				stayAddress: { street: stayStreet.trim(), city: stayCity.trim() },
				proofOfStayDocId: proofDocId,
			});

			if (result.status === "success") {
				setOrgName(result.orgName ?? "");
				setReference(result.reference ?? "");
				setDialogState("success");
			} else if (result.status === "already_in_progress") {
				setOrgName(result.orgName ?? "");
				setExistingReference(result.reference ?? "");
				setDialogState("already_in_progress");
			} else {
				setDialogState("error");
				setErrorMessage(
					t(
						"mySpace.notification.dialog.submissionFailed",
						"La soumission a échoué.",
					),
				);
			}
		} catch (err) {
			setDialogState("error");
			setErrorMessage(
				err instanceof Error
					? err.message
					: t(
							"mySpace.notification.dialog.unexpectedError",
							"Erreur inattendue.",
						),
			);
		}
	}, [
		submitRequest,
		destinationCountry,
		stayStart,
		stayEnd,
		stayReason,
		stayStreet,
		stayCity,
		proofDocId,
		t,
	]);

	const handleBack = useCallback(() => {
		setDialogState("select_country");
		setOrgName("");
		setExistingReference("");
		setErrorMessage("");
		setStayFormError("");
	}, []);

	const handleBackFromStayForm = useCallback(() => {
		setDialogState("org_found");
		setStayFormError("");
	}, []);

	const handleProofUploadComplete = useCallback(async (documentId: string) => {
		setProofDocId(documentId as Id<"documents">);
	}, []);

	const handleViewExistingRequest = useCallback(() => {
		if (!existingReference) return;
		router.push(`/my-space/requests/${existingReference}`);
		onOpenChange(false);
	}, [existingReference, router, onOpenChange]);

	return (
		<BottomSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("mySpace.notification.dialog.title")}
			icon={<Plane className="h-4 w-4 text-amber-600" />}
			maxHeight="90vh"
			maxWidthClass="max-w-xl"
		>
			<div className="px-4 py-4 sm:px-5 space-y-4">
				<p className="text-sm text-muted-foreground">
					{t(
						"mySpace.notification.dialog.description",
						"Signalez votre déplacement temporaire auprès de la Représentation consulaire ou diplomatique compétente.",
					)}
				</p>
				<div className="space-y-4">
					{/* Step 1: Select destination country */}
					{dialogState === "select_country" && (
						<div className="space-y-4">
							<div className="p-3 bg-muted/50 border rounded-lg space-y-2">
								<div className="flex items-center gap-2">
									<MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
									<p className="text-sm font-medium">
										{t(
											"mySpace.notification.dialog.selectCountry",
											"Dans quel pays vous rendez-vous ?",
										)}
									</p>
								</div>
								<CountrySelect
									type="single"
									selected={destinationCountry}
									onChange={setDestinationCountry}
									placeholder={t(
										"mySpace.notification.dialog.countryPlaceholder",
										"Sélectionner le pays de destination",
									)}
								/>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => onOpenChange(false)}
									className="flex-1"
								>
									{t("common.cancel")}
								</Button>
								<Button
									onClick={handleCountrySelected}
									disabled={!destinationCountry}
									className="flex-1"
								>
									{t("common.continue")}
								</Button>
							</div>
						</div>
					)}

					{/* Checking state */}
					{dialogState === "checking" && (
						<div className="flex items-center gap-3 text-muted-foreground">
							<Loader2 className="h-5 w-5 animate-spin" />
							<span>
								{t(
									"mySpace.notification.dialog.searching",
									"Recherche du consulat compétent...",
								)}
							</span>
						</div>
					)}

					{/* Org found */}
					{dialogState === "org_found" && (
						<div className="space-y-4">
							<div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
								<Building2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
								<div>
									<p className="text-sm font-medium">
										{t(
											"mySpace.notification.dialog.orgFound",
											"Consulat compétent trouvé",
										)}
									</p>
									<p className="text-primary font-semibold mt-1">{orgName}</p>
								</div>
							</div>
							<p className="text-sm text-muted-foreground">
								{t(
									"mySpace.notification.dialog.confirmMessage",
									"Confirmez-vous vouloir signaler votre présence auprès de ce consulat ?",
								)}
							</p>
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={handleBack}
									className="flex-1"
								>
									{t("common.back")}
								</Button>
								<Button
									onClick={handleProceedToStayForm}
									className="flex-1"
								>
									{t(
										"mySpace.notification.dialog.continueToStayInfo",
										"Renseigner mon séjour",
									)}
								</Button>
							</div>
						</div>
					)}

					{/* Step 2: Fill stay information */}
					{dialogState === "fill_stay_info" && (
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">
								Renseignez les informations de votre séjour et joignez un
								justificatif (réservation d'hôtel, attestation d'hébergement,
								billet de retour, etc.).
							</p>

							<div className="space-y-1.5">
								<Label className="text-xs">Date d'arrivée</Label>
								<DatePicker date={stayStart} setDate={setStayStart} />
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Date de départ prévue</Label>
								<DatePicker date={stayEnd} setDate={setStayEnd} />
							</div>

							<div className="space-y-1.5">
								<Label className="text-xs">Motif du séjour</Label>
								<Select
									value={stayReason}
									onValueChange={(v) => setStayReason(v as StayReason)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Sélectionner un motif" />
									</SelectTrigger>
									<SelectContent>
										{STAY_REASON_OPTIONS.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label className="text-xs">Adresse / Hôtel</Label>
								<Input
									value={stayStreet}
									onChange={(e) => setStayStreet(e.target.value)}
									placeholder="Numéro et nom de rue, hôtel…"
								/>
							</div>

							<div className="space-y-1.5">
								<Label className="text-xs">Ville</Label>
								<Input
									value={stayCity}
									onChange={(e) => setStayCity(e.target.value)}
									placeholder="Ville de séjour"
								/>
							</div>

							<div className="space-y-1.5">
								<Label className="text-xs">
									Justificatif de séjour <span className="text-destructive">*</span>
								</Label>
								{proofDocId ? (
									<div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
										<FileCheck2 className="h-4 w-4 text-green-600 shrink-0" />
										<span className="text-sm text-green-700 flex-1">
											Justificatif joint
										</span>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setProofDocId(undefined)}
										>
											Remplacer
										</Button>
									</div>
								) : (
									<FileUploader
										onUploadComplete={handleProofUploadComplete}
										docType={DetailedDocumentType.HostingCertificate}
										label="Glissez votre justificatif ici ou cliquez pour parcourir"
									/>
								)}
							</div>

							{stayFormError && (
								<div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
									<X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
									<p className="text-sm text-destructive">{stayFormError}</p>
								</div>
							)}

							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={handleBackFromStayForm}
									className="flex-1"
								>
									{t("common.back")}
								</Button>
								<Button onClick={handleSubmit} className="flex-1">
									{t(
										"mySpace.notification.dialog.confirm",
										"Confirmer le signalement",
									)}
								</Button>
							</div>
						</div>
					)}

					{/* Already in progress */}
					{dialogState === "already_in_progress" && (
						<div className="space-y-4">
							<div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
								<FileClock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
								<div>
									<p className="text-sm font-medium text-amber-700">
										{t(
											"mySpace.notification.dialog.alreadyInProgress.title",
											"Vous avez déjà signalé ce déplacement",
										)}
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										{t(
											"mySpace.notification.dialog.alreadyInProgress.description",
											"Un signalement vers ce pays est en cours de traitement auprès de {{orgName}}.",
											{ orgName },
										)}
									</p>
									{existingReference && (
										<p className="text-sm mt-1">
											{t("mySpace.notification.dialog.reference")} :{" "}
											<span className="font-mono font-semibold text-primary">
												{existingReference}
											</span>
										</p>
									)}
								</div>
							</div>
							<div className="flex flex-col sm:flex-row gap-2">
								<Button
									variant="outline"
									onClick={handleBack}
									className="flex-1"
								>
									{t(
										"mySpace.notification.dialog.alreadyInProgress.changeCountry",
										"Choisir un autre pays",
									)}
								</Button>
								<Button
									onClick={handleViewExistingRequest}
									disabled={!existingReference}
									className="flex-1"
								>
									{t(
										"mySpace.notification.dialog.alreadyInProgress.viewRequest",
										"Voir mon signalement",
									)}
								</Button>
							</div>
						</div>
					)}

					{/* Submitting */}
					{dialogState === "submitting" && (
						<div className="flex items-center gap-3 text-muted-foreground">
							<Loader2 className="h-5 w-5 animate-spin" />
							<span>
								{t(
									"mySpace.notification.dialog.submitting",
									"Envoi de votre signalement...",
								)}
							</span>
						</div>
					)}

					{/* Success */}
					{dialogState === "success" && (
						<div className="space-y-4">
							<div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
								<Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
								<div>
									<p className="text-sm font-medium text-green-600">
										{t(
											"mySpace.notification.dialog.success",
											"Signalement envoyé avec succès !",
										)}
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										{t(
											"mySpace.notification.dialog.successOrg",
											"Consulat : {{orgName}}",
											{ orgName },
										)}
									</p>
									{reference && (
										<p className="text-sm mt-1">
											{t("mySpace.notification.dialog.reference")}{" "}
											:{" "}
											<span className="font-mono font-semibold text-primary">
												{reference}
											</span>
										</p>
									)}
								</div>
							</div>
							<Button
								onClick={() => onOpenChange(false)}
								className="w-full"
							>
								{t("common.close")}
							</Button>
						</div>
					)}

					{/* Not found / Not applicable */}
					{(dialogState === "not_found" ||
						dialogState === "not_applicable") && (
						<div className="space-y-4">
							<div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
								<X className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
								<div>
									<p className="text-sm font-medium text-amber-600">
										{dialogState === "not_applicable"
											? t(
													"mySpace.notification.dialog.notApplicable",
													"Le signalement n'est pas disponible pour votre profil.",
												)
											: t(
													"mySpace.notification.dialog.notFound",
													"Aucun consulat compétent trouvé pour ce pays de destination.",
												)}
									</p>
								</div>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={handleBack}
									className="flex-1"
								>
									{t("common.back")}
								</Button>
								<Button
									variant="outline"
									onClick={() => onOpenChange(false)}
									className="flex-1"
								>
									{t("common.close")}
								</Button>
							</div>
						</div>
					)}

					{/* Error */}
					{dialogState === "error" && (
						<div className="space-y-4">
							<div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
								<X className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
								<p className="text-sm text-destructive">{errorMessage}</p>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={handleBack}
									className="flex-1"
								>
									{t("common.back")}
								</Button>
								<Button
									variant="outline"
									onClick={() => onOpenChange(false)}
									className="flex-1"
								>
									{t("common.close")}
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</BottomSheet>
	);
}
