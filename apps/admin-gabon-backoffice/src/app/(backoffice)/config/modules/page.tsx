"use client";

/**
 * Modules & Permissions — Redirige directement vers /reps
 * Route conservée pour éviter les 404 sur d'anciens liens.
 */
import { redirect } from "next/navigation";

export default function ConfigModulesPage() {
	redirect("/reps");
}
