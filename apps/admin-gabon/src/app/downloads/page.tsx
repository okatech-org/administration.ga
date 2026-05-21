/**
 * /downloads — Page publique listant toutes les versions de Consulat Agent.
 *
 * Placée HORS du route group `(app)/` donc pas d'auth wall. Utilisée pour :
 *  - les liens directs (emails, documentation)
 *  - les agents qui ne sont pas encore connectés (premier install)
 *  - les systèmes non-détectés par le popover de la navbar
 */
export const dynamic = "force-dynamic";

import { DownloadsPageClient } from "./DownloadsPageClient";

export default function DownloadsPage() {
	return <DownloadsPageClient />;
}
