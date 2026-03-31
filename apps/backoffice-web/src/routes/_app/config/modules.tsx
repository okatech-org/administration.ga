/**
 * Modules & Permissions — Redirige vers Représentations
 *
 * Cette page est désormais intégrée dans la page Représentations.
 * On conserve la route pour éviter les 404 sur d'anciens liens.
 */

import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/config/modules")({
	component: () => <Navigate to="/config/representations" />,
});
