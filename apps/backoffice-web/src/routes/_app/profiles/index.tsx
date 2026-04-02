/**
 * Profils — Redirige vers /users?view=profiles
 * Le contenu est désormais intégré dans la page Comptes & Profils.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/profiles/")({
	beforeLoad: () => {
		throw redirect({ to: "/users", search: { view: "profiles" } });
	},
});
