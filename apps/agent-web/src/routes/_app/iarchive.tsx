/**
 * iArchive — Redirige vers iDocument (onglet Archive)
 *
 * L'archive est désormais intégrée comme onglet dans iDocument.
 * Cette route est conservée pour éviter les 404 sur d'anciens liens.
 */

import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/iarchive")({
	component: () => <Navigate to="/idocument" />,
});
