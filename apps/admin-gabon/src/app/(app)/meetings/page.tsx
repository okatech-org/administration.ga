import { redirect } from "next/navigation";

/**
 * Rétro-compat : la page /meetings standalone a été supprimée — toute la
 * gestion des réunions vit dans /icom ?tab=imeeting. Les anciens liens
 * (`/meetings?join=<id>`, etc.) sont redirigés ici.
 */
export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ join?: string }>;
}) {
	const { join } = await searchParams;
	if (join) redirect(`/icom?tab=imeeting&active=${join}`);
	redirect("/icom?tab=imeeting");
}
