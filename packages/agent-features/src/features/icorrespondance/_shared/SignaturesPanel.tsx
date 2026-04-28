/**
 * SignaturesPanel — Liste des signatures électroniques apposées sur un dossier.
 */

import type { Doc } from "@convex/_generated/dataModel";
import { ShieldCheck } from "lucide-react";

interface SignaturesPanelProps {
	signatures: Doc<"correspondanceSignatures">[] | undefined;
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleString("fr-FR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function SignaturesPanel({ signatures }: SignaturesPanelProps) {
	if (!signatures || signatures.length === 0) return null;

	return (
		<div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
			<div className="flex items-center gap-2">
				<ShieldCheck className="h-4 w-4 text-emerald-500" />
				<h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
					Signatures apposées
				</h4>
				<span className="text-[10px] text-muted-foreground ml-auto">
					{signatures.length} sceau{signatures.length > 1 ? "x" : ""}
				</span>
			</div>

			<div className="space-y-2">
				{signatures.map((s) => (
					<div
						key={s._id}
						className="rounded-lg border border-emerald-500/15 bg-card/40 p-3 space-y-1"
					>
						<div className="flex items-center justify-between gap-2">
							<span className="text-xs font-medium">{s.signerName}</span>
							<span className="text-[9px] font-mono text-muted-foreground">
								{s.serialNumber}
							</span>
						</div>
						{s.signerTitle && (
							<p className="text-[10px] text-muted-foreground">{s.signerTitle}</p>
						)}
						<p className="text-[10px] text-muted-foreground">
							{s.signerOrgName} • {formatDate(s.signedAt)}
						</p>
						{s.documentLabel && (
							<p className="text-[10px] text-muted-foreground italic">
								Document : {s.documentLabel}
							</p>
						)}
						<p className="text-[9px] font-mono text-muted-foreground/70 break-all pt-1 border-t border-emerald-500/10">
							SHA-256 : {s.documentHash}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
