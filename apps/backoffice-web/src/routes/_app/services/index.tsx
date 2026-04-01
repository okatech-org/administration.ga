/**
 * Services — Redirige vers Affaires Consulaires (onglet Catalogue)
 * Le contenu est désormais intégré dans /affaires-consulaires.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/services/")({
	beforeLoad: () => {
		throw redirect({ to: "/affaires-consulaires" });
	},
});
