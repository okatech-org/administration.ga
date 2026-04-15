/**
 * BackofficeSettingsTab — onglet Réglages du backoffice iAsted.
 *
 * Extrait depuis `BackofficeIAstedWindow` pour rester cohérent avec le pattern
 * des autres onglets (fichier dédié par tab).
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { useSuperAdminData } from "@/hooks/use-superadmin-data";

export function BackofficeSettingsTab() {
	const user = useSuperAdminData();

	return (
		<div className="flex-1 p-4 space-y-4">
			<div className="space-y-2">
				<h4 className="text-xs font-semibold text-muted-foreground uppercase">Compte</h4>
				<div className="rounded-lg border p-3 space-y-1">
					<p className="text-sm font-medium">{user.userData?.name ?? "SuperAdmin"}</p>
					<p className="text-xs text-muted-foreground">{user.userData?.email}</p>
					<Badge variant="outline" className="text-[9px] mt-1">
						{user.isSuperAdmin ? "Super Administrateur" : "Administrateur"}
					</Badge>
				</div>
			</div>
			<div className="space-y-2">
				<h4 className="text-xs font-semibold text-muted-foreground uppercase">
					À propos
				</h4>
				<div className="rounded-lg border p-3 space-y-1">
					<p className="text-xs text-muted-foreground">iAsted v1.0 — Assistant IA</p>
					<p className="text-xs text-muted-foreground">Plateforme Consulat.ga</p>
				</div>
			</div>
		</div>
	);
}
