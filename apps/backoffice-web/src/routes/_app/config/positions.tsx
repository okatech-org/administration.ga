/**
 * Postes & Profils — Redirige directement vers /reps
 * Route conservée pour éviter les 404 sur d'anciens liens.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/config/positions")({
	beforeLoad: () => {
		throw redirect({ to: "/reps" });
	},
});
