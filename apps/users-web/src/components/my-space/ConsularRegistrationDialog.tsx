import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import {
	AlertTriangle,
	Building2,
	CheckCircle2,
	Loader2,
	Send,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

type DialogState =
	| "checking"
	| "org_found"
	| "submitting"
	| "success"
	| "not_found"
	| "error";

interface ConsularRegistrationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function ConsularRegistrationDialog({
	open,
	onOpenChange,
	onSuccess,
}: ConsularRegistrationDialogProps) {
	const { t } = useTranslation();
	const submitRequest = useMutation(
		api.functions.profiles.submitRegistrationRequest,
	);

	// Read-only query to find the org
	const { data: orgCheck } = useAuthenticatedConvexQuery(
		api.functions.profiles.findRegistrationOrg,
		open ? {} : "skip",
	);

	const [state, setState] = useState<DialogState>("checking");
	const [reference, setReference] = useState<string | null>(null);

	// React to the query result
	useEffect(() => {
		if (!open) {
			setState("checking");
			setReference(null);
			return;
		}

		if (!orgCheck) return; // still loading

		if (orgCheck.status === "found") {
			setState("org_found");
		} else if (
			orgCheck.status === "no_org_found" ||
			orgCheck.status === "no_service"
		) {
			setState("not_found");
		} else {
			setState("error");
		}
	}, [open, orgCheck]);

	const handleConfirmSubmit = useCallback(async () => {
		setState("submitting");
		try {
			const res = await submitRequest({});
			if (res.status === "success") {
				setReference(res.reference ?? null);
				setState("success");
			} else {
				setState("error");
			}
		} catch {
			setState("error");
		}
	}, [submitRequest]);

	const orgName = orgCheck?.status === "found" ? orgCheck.orgName : undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{t("mySpace.registration.dialog.title")}
					</DialogTitle>
					<DialogDescription>
						{state === "checking" &&
							t(
								"mySpace.registration.dialog.checking",
								"Recherche d'un organisme de rattachement...",
							)}
						{state === "org_found" &&
							t(
								"mySpace.registration.dialog.readyDescription",
								"Un organisme consulaire a été trouvé pour votre pays de résidence.",
							)}
						{state === "submitting" &&
							t(
								"mySpace.registration.dialog.submitting",
								"Envoi de votre demande...",
							)}
						{state === "success" &&
							t(
								"mySpace.registration.dialog.foundDescription",
								"Votre demande a été envoyée à {{orgName}}",
								{ orgName },
							)}
						{state === "not_found" &&
							t(
								"mySpace.registration.dialog.notFoundDescription",
								"Aucun organisme consulaire n'offre ce service en ligne pour votre pays de résidence. Veuillez réessayer plus tard.",
							)}
						{state === "error" &&
							t(
								"register.error.description",
								"Veuillez réessayer ou contacter le support.",
							)}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col items-center py-6 gap-4">
					{/* Checking state — loader */}
					{state === "checking" && (
						<div className="flex flex-col items-center gap-3">
							<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
								<Loader2 className="h-8 w-8 text-primary animate-spin" />
							</div>
						</div>
					)}

					{/* Org found — show org + ask to confirm */}
					{state === "org_found" && orgName && (
						<div className="flex flex-col items-center gap-4 w-full">
							<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
								<Building2 className="h-8 w-8 text-primary" />
							</div>
							<p className="text-base font-semibold text-center">
								{t(
									"mySpace.registration.dialog.orgFound",
									"Organisme de rattachement trouvé",
								)}
							</p>
							<div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2.5 rounded-lg border border-primary/20 w-full justify-center">
								<Building2 className="h-4 w-4 shrink-0" />
								<span className="font-medium">{orgName}</span>
							</div>
							<p className="text-sm text-muted-foreground text-center">
								{t(
									"mySpace.registration.dialog.confirmQuestion",
									"Souhaitez-vous envoyer votre demande d'inscription consulaire à cet organisme ?",
								)}
							</p>
						</div>
					)}

					{/* Submitting — loader */}
					{state === "submitting" && (
						<div className="flex flex-col items-center gap-3">
							<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
								<Loader2 className="h-8 w-8 text-primary animate-spin" />
							</div>
						</div>
					)}

					{/* Success — request sent */}
					{state === "success" && (
						<div className="flex flex-col items-center gap-4 w-full">
							<div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
								<CheckCircle2 className="h-8 w-8 text-green-500" />
							</div>
							<p className="text-base font-semibold text-center">
								{t("mySpace.registration.dialog.success")}
							</p>
							{orgName && (
								<div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2.5 rounded-lg border border-primary/20 w-full justify-center">
									<Building2 className="h-4 w-4 shrink-0" />
									<span className="font-medium">{orgName}</span>
								</div>
							)}
							{reference && (
								<div className="text-center">
									<span className="text-xs text-muted-foreground">
										{t("mySpace.registration.dialog.reference")}
									</span>
									<p className="font-mono text-sm font-semibold text-primary">
										{reference}
									</p>
								</div>
							)}
						</div>
					)}

					{/* Not found */}
					{state === "not_found" && (
						<div className="flex flex-col items-center gap-3">
							<div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
								<AlertTriangle className="h-8 w-8 text-orange-500" />
							</div>
							<p className="text-base font-semibold text-center">
								{t(
									"mySpace.registration.dialog.notFound",
									"Aucun organisme disponible",
								)}
							</p>
						</div>
					)}

					{/* Error */}
					{state === "error" && (
						<div className="flex flex-col items-center gap-3">
							<div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
								<AlertTriangle className="h-8 w-8 text-destructive" />
							</div>
							<p className="text-base font-semibold text-center">
								{t("register.error.title")}
							</p>
						</div>
					)}
				</div>

				<DialogFooter>
					{/* Org found → confirm or cancel */}
					{state === "org_found" && (
						<div className="flex gap-2 w-full">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => onOpenChange(false)}
							>
								{t("common.cancel")}
							</Button>
							<Button className="flex-1 gap-1.5" onClick={handleConfirmSubmit}>
								<Send className="h-4 w-4" />
								{t("mySpace.registration.dialog.send")}
							</Button>
						</div>
					)}

					{/* Success → close */}
					{state === "success" && (
						<Button
							className="w-full"
							onClick={() => {
								onOpenChange(false);
								onSuccess?.();
							}}
						>
							{t("mySpace.registration.dialog.confirm")}
						</Button>
					)}

					{/* Not found → close */}
					{state === "not_found" && (
						<Button
							variant="outline"
							className="w-full"
							onClick={() => onOpenChange(false)}
						>
							{t("mySpace.registration.dialog.retry")}
						</Button>
					)}

					{/* Error → retry or cancel */}
					{state === "error" && (
						<Button
							variant="outline"
							className="w-full"
							onClick={() => onOpenChange(false)}
						>
							{t("common.cancel")}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
