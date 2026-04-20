"use client";

/**
 * Calls — Redirige vers iAsted (onglet iAppel)
 *
 * Les appels sont désormais intégrés dans la fenêtre iAsted.
 * Cette route est conservée pour éviter les 404 sur d'anciens liens.
 */

import { useRouter } from "@workspace/routing";
import { useEffect } from "react";

export default function CallsPage() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/iasted");
	}, [router]);

	return null;
}
