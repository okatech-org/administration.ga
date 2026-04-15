/**
 * VersionHistory — historique des versions de config iAsted avec diff + rollback.
 *
 * Phase 4 stub : rend une liste paginée de versions (structure DS v3).
 * Le consumer (backoffice) fournit la liste `versions` depuis `convex/functions/auditLog.ts`.
 *
 * Le handler `onRollback` déclenche la mutation Convex de restauration.
 */

"use client";

import { Clock, RotateCcw } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface ConfigVersion {
	/** ID Convex de la version. */
	id: string;
	/** Timestamp de création. */
	createdAt: number;
	/** Email / nom de l'utilisateur ayant fait la modif. */
	updatedBy: string;
	/** Raison / changelog libre. */
	reason?: string;
	/** Indique si c'est la version actuellement active. */
	isCurrent?: boolean;
}

export interface VersionHistoryProps {
	versions: ConfigVersion[];
	/** Handler de rollback (ouvre une confirmation avant mutation). */
	onRollback?: (versionId: string) => void;
	/** Empty state si aucune version. */
	emptyMessage?: string;
	className?: string;
}

export function VersionHistory({
	versions,
	onRollback,
	emptyMessage = "Aucune version antérieure disponible.",
	className,
}: VersionHistoryProps) {
	if (versions.length === 0) {
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-2 rounded-xl bg-card p-6 text-center",
					className,
				)}
			>
				<Clock className="h-8 w-8 text-muted-foreground" />
				<p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<div className="flex items-center gap-2">
				<Clock className="h-4 w-4 text-primary" />
				<h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
					Historique des versions
				</h3>
			</div>
			<ul className="flex flex-col gap-1 rounded-xl bg-card p-2">
				{versions.map((v) => (
					<li key={v.id}>
						<div
							className={cn(
								"flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
								v.isCurrent ? "bg-primary/5" : "hover:bg-foreground/5",
							)}
						>
							<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground/8">
								<Clock className="h-3 w-3 text-muted-foreground" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="text-xs font-bold text-foreground">
										{new Date(v.createdAt).toLocaleString("fr-FR")}
									</span>
									{v.isCurrent && (
										<span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
											Actuelle
										</span>
									)}
								</div>
								<p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground">
									{v.updatedBy}
									{v.reason && ` · ${v.reason}`}
								</p>
							</div>
							{!v.isCurrent && onRollback && (
								<button
									type="button"
									onClick={() => onRollback(v.id)}
									className="flex items-center gap-1 rounded-md bg-foreground/8 px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-foreground/12 active:scale-[0.97]"
								>
									<RotateCcw className="h-3 w-3" />
									Restaurer
								</button>
							)}
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
