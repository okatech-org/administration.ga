import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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

interface ChildConsularRegistrationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	childProfileId: Id<"childProfiles">;
	childName: string;
	onSuccess?: () => void;
}

export function ChildConsularRegistrationDialog({
	open,
	onOpenChange,
	childProfileId,
	childName,
	onSuccess,
}: ChildConsularRegistrationDialogProps) {
	const { t } = useTranslation();
	const submitRequest = useMutation(
		api.functions.childProfiles.submitRegistrationRequest,
	);

	const { data: orgCheck } = useAuthenticatedConvexQuery(
		api.functions.childProfiles.findRegistrationOrg,
		open ? { childProfileId } : "skip",
	);

	const [state, setState] = useState<DialogState>("checking");
	const [reference, setReference] = useState<string | null>(null);

	useEffect(() => {
		if (!open) {
			setState("checking");
			setReference(null);
			return;
		}

		if (!orgCheck) return;

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
			const res = await submitRequest({ childProfileId });
			if (res.status === "success") {
				setReference(res.reference ?? null);
				setState("success");
			} else {
				setState("error");
			}
		} catch {
			setState("error");
		}
	}, [submitRequest, childProfileId]);

	const orgName = orgCheck?.status === "found" ? orgCheck.orgName : undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{t(
							"mySpace.registration.dialog.childTitle",
							"Inscription consulaire pour {{name}}",
							{ name: childName },
						)}
					</DialogTitle>
					<DialogDescription>
						{state === "checking" &&
							t(
								"mySpace.registration.dialog.checking",
								"Recherche d'un organisme de rattachement...",
							)}
						{state === "org_found" &&
							t(
								"mySpace.registration.dialog.childReadyDescription",
								"Un organisme consulaire a été trouvé pour inscrire {{name}}.",
								{ name: childName },
							)}
						{state === "submitting" &&
							t(
								"mySpace.registration.dialog.submitting",
								"Envoi de votre demande...",
							)}
						{state === "success" &&
							t(
								"mySpace.registration.dialog.childSuccess",
								"La demande d'inscription pour {{name}} a été envoyée à {{orgName}}",
								{ name: childName, orgName },
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
					{state === "checking" && (
						<div className="flex flex-col items-center gap-3">
							<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
								<Loader2 className="h-8 w-8 text-primary animate-spin" />
							</div>
						</div>
					)}

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
									"mySpace.registration.dialog.childConfirmQuestion",
									"Souhaitez-vous envoyer la demande d'inscription consulaire pour {{name}} à cet organisme ?",
									{ name: childName },
								)}
							</p>
						</div>
					)}

					{state === "submitting" && (
						<div className="flex flex-col items-center gap-3">
							<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
								<Loader2 className="h-8 w-8 text-primary animate-spin" />
							</div>
						</div>
					)}

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

					{state === "not_found" && (
						<Button
							variant="outline"
							className="w-full"
							onClick={() => onOpenChange(false)}
						>
							{t("mySpace.registration.dialog.retry")}
						</Button>
					)}

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
