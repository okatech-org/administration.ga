/**
 * Config Services — Redirige directement vers /affaires-consulaires
 * Route conservée pour éviter les 404 sur d'anciens liens.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/config/services")({
	beforeLoad: () => {
		throw redirect({ to: "/affaires-consulaires" });
	},
});
