/**
 * Services — Redirige vers Affaires Consulaires (onglet Catalogue)
 * Le contenu est désormais intégré dans /affaires-consulaires.
 */
import { redirect } from "next/navigation";

export default function ServicesPage() {
	redirect("/affaires-consulaires");
}
