/**
 * IAstedSettingsTab — Réglages du panneau iAsted.
 *
 * Inclut le sélecteur de statut agent avec Do-Not-Disturb (Phase β du plan
 * Intelligence iAsted × Sprint 6). La mutation `setDnd` écrit côté Convex,
 * `callCenter.resolveEligibleMemberships` exclut alors l'agent du routing.
 */

"use client";

import { api } from "@convex/_generated/api";
import { Bell, Volume2 } from "lucide-react";
import { useState } from "react";
import { AgentStatusSelector, useAgentStatus } from "@workspace/iasted";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Switch } from "@workspace/ui/components/switch";
import { useOrg } from "../../shell/org-provider";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";

export function IAstedSettingsTab() {
	// Note : la langue et le thème sont des préférences GLOBALES de
	// l'application, pas spécifiques à iCom. Elles sont pilotées depuis la
	// sidebar (toggle FR/EN + dark/light) — on ne les dédouble pas ici.
	const [notifications, setNotifications] = useState(true);
	const [sounds, setSounds] = useState(true);
	const { activeOrgId } = useOrg();

	// Presence snapshot côté Convex — mapping vers AgentPresenceSnapshot
	// attendu par `useAgentStatus` (Plan Phase β).
	const { data: presenceRow } = useAuthenticatedConvexQuery(
		api.functions.agentPresence.getMine,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const { mutateAsync: setDndMutation } = useConvexMutationQuery(
		api.functions.agentPresence.setDnd,
	);

	const snapshot =
		presenceRow && activeOrgId
			? {
					userId: String(presenceRow.userId),
					orgId: String(presenceRow.orgId),
					status: presenceRow.status,
					lastHeartbeat: presenceRow.lastHeartbeat,
					lastActivity: presenceRow.lastActivity,
					dndUntil: presenceRow.dndUntil,
					currentCallId: presenceRow.currentCallId
						? String(presenceRow.currentCallId)
						: undefined,
					activeCallId: presenceRow.activeCallId
						? String(presenceRow.activeCallId)
						: undefined,
					currentCallIds: presenceRow.currentCallIds?.map((id) => String(id)),
					clientType: presenceRow.clientType,
				}
			: null;

	const {
		status: extendedStatus,
		dndUntil: effectiveDndUntil,
		setDndUntil,
		clearDnd,
	} = useAgentStatus({
		userId: snapshot?.userId ?? "unknown",
		presence: snapshot,
	});

	const handleSetDnd = async (expiresAt: number) => {
		if (!activeOrgId) return;
		await setDndMutation({ orgId: activeOrgId, expiresAt });
		setDndUntil(expiresAt);
	};

	const handleClearDnd = async () => {
		if (!activeOrgId) return;
		await setDndMutation({ orgId: activeOrgId, expiresAt: null });
		clearDnd();
	};

	return (
		<ScrollArea className="flex-1 min-h-0">
			<div className="p-4 space-y-5">
				<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Réglages
				</h3>

				{/* Statut agent — Do-Not-Disturb (Phase β : routing-aware) */}
				{activeOrgId && (
					<div className="space-y-2">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Disponibilité
						</p>
						<AgentStatusSelector
							status={extendedStatus}
							dndUntil={effectiveDndUntil}
							onSetDnd={handleSetDnd}
							onClearDnd={handleClearDnd}
						/>
						<p className="text-[10px] text-muted-foreground">
							En mode DND, vous êtes exclu du routing des appels entrants.
						</p>
					</div>
				)}

				{/* Notifications */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
								<Bell className="h-4 w-4 text-blue-500" />
							</div>
							<div>
								<Label className="text-xs font-medium">Notifications</Label>
								<p className="text-[10px] text-muted-foreground">Recevoir les alertes iAsted</p>
							</div>
						</div>
						<Switch checked={notifications} onCheckedChange={setNotifications} />
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
								<Volume2 className="h-4 w-4 text-violet-500" />
							</div>
							<div>
								<Label className="text-xs font-medium">Sons</Label>
								<p className="text-[10px] text-muted-foreground">Son des messages et appels</p>
							</div>
						</div>
						<Switch checked={sounds} onCheckedChange={setSounds} />
					</div>
				</div>

				{/* Info */}
				<div className="pt-4 border-t text-center">
					<p className="text-[10px] text-muted-foreground">
						iAsted v1.0 — Agent IA Diplomate
					</p>
					<p className="text-[9px] text-muted-foreground/50 mt-0.5">
						Digitalium / gabon-diplomatie
					</p>
				</div>
			</div>
		</ScrollArea>
	);
}
