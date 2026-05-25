"use client";

/**
 * Route directe vers la configuration de signature (deep link). L'UI est
 * également accessible via l'onglet « Signature » de la page /settings.
 */

import { SignatureSettingsCard } from "@/components/settings/SignatureSettingsCard";

export default function SignaturePage() {
	return (
		<div className="p-4 md:p-6">
			<SignatureSettingsCard />
		</div>
	);
}
