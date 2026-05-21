"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Profils — Redirige vers /users?view=profiles
 * Le contenu est désormais intégré dans la page Comptes & Profils.
 */
export default function ProfilesRedirectPage() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/users?view=profiles");
	}, [router]);

	return null;
}
