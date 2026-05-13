"use client";

/**
 * Calls — Redirige vers iCom (onglet iAppel)
 *
 * Les appels sont désormais intégrés dans la fenêtre iCom.
 * Cette route est conservée pour éviter les 404 sur d'anciens liens.
 */

import { useRouter } from "@workspace/routing";
import { useEffect } from "react";
import {
	usePageContext,
	useRegisterPageAction,
} from "../../hooks/use-page-context";

export default function CallsPage() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/icom");
	}, [router]);

	usePageContext({
		module: "calls-redirect",
		title: "Appels",
		summary:
			"Page de redirection. Les appels sont gérés dans iCom (onglet iAppel).",
		visibleEntities: [],
		availableActions: [
			{
				id: "calls.navigate_to_icom",
				label: "Aller à iCom (iAppel)",
				description: "Navigue vers /icom?tab=icall.",
			},
		],
		scopedToolNames: [],
	});
	useRegisterPageAction("calls.navigate_to_icom", async () => {
		router.replace("/icom?tab=icall");
		return { success: true };
	});

	return null;
}
