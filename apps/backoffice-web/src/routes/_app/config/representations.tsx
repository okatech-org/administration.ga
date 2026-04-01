/**
 * Représentations — Redirige vers /reps
 * Le contenu est désormais intégré dans la page /reps avec onglets.
 */
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/config/representations")({
  component: () => <Navigate to="/reps" />,
});
