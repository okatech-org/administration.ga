/**
 * Demandes — Redirige vers Affaires Consulaires (onglet Demandes)
 * Le contenu est désormais intégré dans /affaires-consulaires.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/requests/")({
	beforeLoad: () => {
		throw redirect({ to: "/affaires-consulaires" });
	},
});
