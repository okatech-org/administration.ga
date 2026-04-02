/**
 * Calls — Redirige vers iAsted (onglet iAppel)
 *
 * Les appels sont désormais intégrés dans la fenêtre iAsted.
 * Cette route est conservée pour éviter les 404 sur d'anciens liens.
 */

import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/calls")({
	component: () => <Navigate to="/iasted" />,
});
