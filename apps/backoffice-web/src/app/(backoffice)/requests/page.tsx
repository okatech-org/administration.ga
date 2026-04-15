/**
 * Demandes — Redirige vers Affaires Consulaires (onglet Demandes)
 * Le contenu est désormais intégré dans /affaires-consulaires.
 */
import { redirect } from "next/navigation";

export default function RequestsPage() {
	redirect("/affaires-consulaires");
}
