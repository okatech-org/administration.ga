/**
 * FeatureFlagsPanel — affichage read-only des feature flags.
 *
 * Phase 4 stub : le consumer (backoffice) passe la map `flags` depuis
 * `apps/agent-web/src/lib/feature-flags.ts` ou équivalent. Le toggle UI
 * ne modifie que le STATE LOCAL (preview), pas la persistance (les flags
 * restent contrôlés par env var).
 */

"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface FeatureFlagEntry {
	/** Nom du flag (ex : "callCenter"). */
	key: string;
	/** Libellé UI. */
	label: string;
	/** Description courte. */
	description?: string;
	/** Valeur actuelle (env). */
	value: boolean;
	/** Cette valeur provient de quelle source ? (affichage badge). */
	source?: "env" | "runtime" | "override";
}

export interface FeatureFlagsPanelProps {
	flags: FeatureFlagEntry[];
	/** Autorise le toggle en mode preview (non persisté). */
	allowPreviewToggle?: boolean;
	className?: string;
}

export function FeatureFlagsPanel({
	flags,
	allowPreviewToggle = true,
	className,
}: FeatureFlagsPanelProps) {
	const [overrides, setOverrides] = useState<Record<string, boolean>>({});

	const toggleFlag = (key: string, currentValue: boolean) => {
		setOverrides((prev) => ({ ...prev, [key]: !currentValue }));
	};

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<div className="flex items-center gap-2">
				<Flag className="h-4 w-4 text-primary" />
				<h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
					Feature flags
				</h3>
				{allowPreviewToggle && (
					<span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400">
						Mode preview
					</span>
				)}
			</div>
			<ul className="flex flex-col gap-1 rounded-xl bg-card p-2">
				{flags.map((flag) => {
					const hasOverride = overrides[flag.key] !== undefined;
					const effective = hasOverride ? overrides[flag.key]! : flag.value;
					return (
						<li
							key={flag.key}
							className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-foreground/5"
						>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="text-xs font-bold text-foreground">{flag.label}</span>
									<code className="rounded bg-foreground/8 px-1 text-[10px] font-mono text-muted-foreground">
										{flag.key}
									</code>
									{hasOverride && (
										<span className="rounded-md bg-amber-500/15 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400">
											Override
										</span>
									)}
								</div>
								{flag.description && (
									<p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
										{flag.description}
									</p>
								)}
							</div>
							<button
								type="button"
								disabled={!allowPreviewToggle}
								onClick={() => toggleFlag(flag.key, effective)}
								className={cn(
									"h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40",
									effective ? "bg-primary" : "bg-muted",
								)}
								aria-pressed={effective}
								aria-label={`Toggle ${flag.label}`}
							>
								<span
									className={cn(
										"block h-4 w-4 translate-y-0.5 rounded-full bg-card transition-transform",
										effective ? "translate-x-[18px]" : "translate-x-0.5",
									)}
								/>
							</button>
						</li>
					);
				})}
			</ul>
			{allowPreviewToggle && (
				<p className="text-[10px] font-medium text-muted-foreground">
					Les toggles en preview ne sont pas persistés. Les valeurs réelles restent
					contrôlées par les variables d'environnement côté serveur.
				</p>
			)}
		</div>
	);
}
