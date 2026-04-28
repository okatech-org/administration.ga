/**
 * InternalManifestExport — Bouton + sélecteur de période pour exporter le
 * bordereau de transmission interne (PDF tabulaire des courriers assignés
 * à un agent ou à l'ensemble des services).
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useConvex } from "convex/react";
import { FileDown, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useConvexActionQuery } from "@workspace/api/hooks";

interface InternalManifestExportProps {
	orgId: Id<"orgs">;
	/** Si fourni, filtre le bordereau sur les courriers assignés à cet agent. */
	assignedToId?: Id<"users">;
}

function toIsoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export function InternalManifestExport({
	orgId,
	assignedToId,
}: InternalManifestExportProps) {
	const [open, setOpen] = useState(false);
	const today = useMemo(() => new Date(), []);
	const sevenDaysAgo = useMemo(() => {
		const d = new Date(today);
		d.setDate(d.getDate() - 7);
		return d;
	}, [today]);

	const [from, setFrom] = useState(toIsoDate(sevenDaysAgo));
	const [to, setTo] = useState(toIsoDate(today));

	const convex = useConvex();
	const { mutateAsync: generate, isPending } = useConvexActionQuery(
		api.functions.correspondanceInternalManifest
			.generateInternalTransmissionManifest,
	);

	const handleExport = async () => {
		const fromTs = new Date(`${from}T00:00:00`).getTime();
		const toTs = new Date(`${to}T23:59:59`).getTime();
		if (Number.isNaN(fromTs) || Number.isNaN(toTs)) {
			toast.error("Dates invalides");
			return;
		}
		if (fromTs > toTs) {
			toast.error("La date de début doit précéder la date de fin");
			return;
		}

		try {
			const result = await generate({
				orgId,
				dateFrom: fromTs,
				dateTo: toTs,
				assignedToId,
			});
			if ("error" in result) {
				toast.error(result.error);
				return;
			}

			const signedUrl = await convex.query(
				api.functions.correspondancePostalManifestQueries.getStorageUrl,
				{ storageId: result.storageId },
			);
			if (signedUrl) {
				const a = document.createElement("a");
				a.href = signedUrl;
				a.download = `transmission-interne-${from}_${to}.pdf`;
				document.body.appendChild(a);
				a.click();
				a.remove();
				toast.success("Bordereau téléchargé");
				setOpen(false);
			} else {
				toast.error("Impossible de récupérer l'URL du fichier");
			}
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de la génération");
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5">
					<FileDown className="h-3.5 w-3.5" />
					Bordereau de transmission
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						Exporter le bordereau de transmission interne
					</DialogTitle>
					<DialogDescription>
						Liste consolidée des courriers assignés
						{assignedToId ? " à cet agent" : " aux services"} sur la période
						sélectionnée, à imprimer comme cahier de transmission à signer
						par l'émetteur du registre et l'agent récepteur.
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-2 gap-3 py-2">
					<div className="space-y-1.5">
						<Label htmlFor="internal-manifest-from" className="text-xs">
							Du
						</Label>
						<Input
							id="internal-manifest-from"
							type="date"
							value={from}
							onChange={(e) => setFrom(e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="internal-manifest-to" className="text-xs">
							Au
						</Label>
						<Input
							id="internal-manifest-to"
							type="date"
							value={to}
							onChange={(e) => setTo(e.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="ghost" onClick={() => setOpen(false)}>
						Annuler
					</Button>
					<Button
						onClick={handleExport}
						disabled={isPending}
						className="gap-1.5"
					>
						{isPending ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<FileDown className="h-3.5 w-3.5" />
						)}
						Générer le PDF
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
