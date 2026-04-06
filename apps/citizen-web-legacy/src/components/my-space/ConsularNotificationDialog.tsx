import { api } from "@convex/_generated/api";
import type { CountryCode } from "@convex/lib/constants";
import { Building2, Check, Loader2, MapPin, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/ui/country-select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type DialogState =
	| "select_country"
	| "checking"
	| "org_found"
	| "submitting"
	| "success"
	| "not_found"
	| "not_applicable"
	| "error";

interface ConsularNotificationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ConsularNotificationDialog({
	open,
	onOpenChange,
}: ConsularNotificationDialogProps) {
	const { t } = useTranslation();
	const [dialogState, setDialogState] = useState<DialogState>("select_country");
	const [destinationCountry, setDestinationCountry] = useState<
		CountryCode | undefined
	>();
	const [orgName, setOrgName] = useState("");
	const [reference, setReference] = useState("");
	const [errorMessage, setErrorMessage] = useState("");

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
			setErrorMessage("");
		}
	}, [open]);

	const handleCountrySelected = useCallback(() => {
		if (!destinationCountry) return;
		setDialogState("checking");
	}, [destinationCountry]);

	const handleSubmit = useCallback(async () => {
		if (!destinationCountry) return;
		setDialogState("submitting");
		try {
			const result = await submitRequest({ destinationCountry });

			if (result.status === "success") {
				setOrgName(result.orgName ?? "");
				setReference(result.reference ?? "");
				setDialogState("success");
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
	}, [submitRequest, destinationCountry, t]);

	const handleBack = useCallback(() => {
		setDialogState("select_country");
		setOrgName("");
		setErrorMessage("");
	}, []);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{t("mySpace.notification.dialog.title")}
					</DialogTitle>
					<DialogDescription>
						{t(
							"mySpace.notification.dialog.description",
							"Signalez votre déplacement temporaire auprès de la Représentation consulaire ou diplomatique compétente.",
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="py-4 space-y-4">
					{/* Step 1: Select destination country */}
					{dialogState === "select_country" && (
						<div className="space-y-4">
							<div className="flex items-start gap-3 p-3 bg-muted/50 border rounded-lg">
								<MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
								<div className="flex-1 space-y-2">
									<p className="text-sm font-medium">
										{t(
											"mySpace.notification.dialog.selectCountry",
											"Dans quel pays vous rendez-vous ?",
										)}
									</p>
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
							</div>
							<div className="flex gap-2 justify-end">
								<Button variant="outline" onClick={() => onOpenChange(false)}>
									{t("common.cancel")}
								</Button>
								<Button
									onClick={handleCountrySelected}
									disabled={!destinationCountry}
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
							<div className="flex gap-2 justify-end">
								<Button variant="outline" onClick={handleBack}>
									{t("common.back")}
								</Button>
								<Button onClick={handleSubmit}>
									{t(
										"mySpace.notification.dialog.confirm",
										"Confirmer le signalement",
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
							<div className="flex justify-end">
								<Button onClick={() => onOpenChange(false)}>
									{t("common.close")}
								</Button>
							</div>
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
							<div className="flex gap-2 justify-end">
								<Button variant="outline" onClick={handleBack}>
									{t("common.back")}
								</Button>
								<Button variant="outline" onClick={() => onOpenChange(false)}>
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
							<div className="flex gap-2 justify-end">
								<Button variant="outline" onClick={handleBack}>
									{t("common.back")}
								</Button>
								<Button variant="outline" onClick={() => onOpenChange(false)}>
									{t("common.close")}
								</Button>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
