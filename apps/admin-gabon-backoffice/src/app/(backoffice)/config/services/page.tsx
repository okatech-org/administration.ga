"use client";

/**
 * Config Services — Redirige directement vers /affaires-consulaires
 * Route conservée pour éviter les 404 sur d'anciens liens.
 */
import { redirect } from "next/navigation";

export default function ConfigServicesPage() {
	redirect("/affaires-consulaires");
}
