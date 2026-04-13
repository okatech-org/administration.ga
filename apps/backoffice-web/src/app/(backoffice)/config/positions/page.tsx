"use client";

/**
 * Postes & Profils — Redirige directement vers /reps
 * Route conservée pour éviter les 404 sur d'anciens liens.
 */
import { redirect } from "next/navigation";

export default function ConfigPositionsPage() {
	redirect("/reps");
}
