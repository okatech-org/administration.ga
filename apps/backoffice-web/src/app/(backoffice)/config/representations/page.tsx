"use client";

/**
 * Représentations — Redirige vers /reps
 * Le contenu est désormais intégré dans la page /reps avec onglets.
 */
import { redirect } from "next/navigation";

export default function ConfigRepresentationsPage() {
	redirect("/reps");
}
