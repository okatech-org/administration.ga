"use client";

/**
 * Calls — Redirige vers iCom (onglet iAppel)
 *
 * Les appels sont désormais intégrés dans la fenêtre iCom.
 * Cette route est conservée pour éviter les 404 sur d'anciens liens.
 */

import { useRouter } from "@workspace/routing";
import { useEffect } from "react";

export default function CallsPage() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/icom");
	}, [router]);

	return null;
}
