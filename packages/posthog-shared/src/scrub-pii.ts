/**
 * RGPD scrubber appliqué aux events PostHog (client + serveur).
 *
 * Compatible avec :
 * - `before_send` de posthog-js (browser)
 * - `before_send` de posthog-node (serveur Next.js / Convex)
 *
 * Stratégie :
 * 1. Masquer les clés sensibles (noms exacts ET sous-chaînes) dans tout l'objet d'event,
 *    récursivement (properties, $set, $set_once, exceptions extra).
 * 2. Nettoyer les query strings de `$current_url` et `$pathname` (tokens d'auth, OTP).
 * 3. Limiter la taille du payload final à 50 KB (protège contre les dumps de state).
 */

type AnyRecord = Record<string, unknown>;

// Clés à masquer intégralement (match insensible à la casse, exact ou en sous-chaîne).
const SENSITIVE_KEY_PATTERNS = [
	"password",
	"passwd",
	"pwd",
	"secret",
	"token",
	"api_key",
	"apikey",
	"authorization",
	"cookie",
	"session_id",
	"sessionid",
	// PII citoyens gabonais
	"passport",
	"passeport",
	"nip",
	"cni",
	"id_card",
	"id_number",
	"national_id",
	"birth_date",
	"date_of_birth",
	"date_naissance",
	"phone",
	"telephone",
	"mobile",
	"email",
	"e_mail",
	"courriel",
	"address",
	"adresse",
	"street",
	"postal_code",
	"code_postal",
	"iban",
	"credit_card",
] as const;

const MASK = "[scrubbed]";
const MAX_PAYLOAD_BYTES = 50_000;

function isSensitiveKey(key: string): boolean {
	const lower = key.toLowerCase();
	return SENSITIVE_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

function stripUrlQuery(value: string): string {
	try {
		const url = new URL(value);
		url.search = "";
		url.hash = "";
		return url.toString();
	} catch {
		// Pas une URL absolue — couper sur '?' pour les paths relatifs
		const qIdx = value.indexOf("?");
		return qIdx === -1 ? value : value.slice(0, qIdx);
	}
}

function isPlainObject(value: object): boolean {
	// On ne récursive que sur des objets « plain » (literals). Tout autre objet
	// (Date, Map, Set, RegExp, instances de classes, etc.) est préservé tel
	// quel — sinon `Object.entries(new Date())` retourne `[]` et l'objet est
	// transformé en `{}`, ce qui casse le `timestamp` du CaptureResult PostHog
	// et fait rejeter l'event à l'ingestion (400 « failed to parse »).
	const proto = Object.getPrototypeOf(value);
	return proto === null || proto === Object.prototype;
}

function scrubValue(key: string, value: unknown, depth: number): unknown {
	if (depth > 6) return MASK;

	if (isSensitiveKey(key)) return MASK;

	if (key === "$current_url" || key === "$pathname" || key === "$referrer") {
		return typeof value === "string" ? stripUrlQuery(value) : value;
	}

	if (value === null || value === undefined) return value;

	if (Array.isArray(value)) {
		return value.map((item) => scrubValue(key, item, depth + 1));
	}

	if (typeof value === "object" && isPlainObject(value as object)) {
		return scrubObject(value as AnyRecord, depth + 1);
	}

	return value;
}

function scrubObject(obj: AnyRecord, depth = 0): AnyRecord {
	if (depth > 6) return {};
	const out: AnyRecord = {};
	for (const [key, value] of Object.entries(obj)) {
		out[key] = scrubValue(key, value, depth);
	}
	return out;
}

/**
 * Tronque un event si sa sérialisation dépasse MAX_PAYLOAD_BYTES.
 * Garde les champs PostHog standards et remplace `properties` par un marqueur.
 */
function truncateIfOversized<T extends AnyRecord>(event: T): T {
	try {
		const serialized = JSON.stringify(event);
		if (serialized.length <= MAX_PAYLOAD_BYTES) return event;
		const properties = event["properties"] as AnyRecord | undefined;
		return {
			...event,
			properties: {
				...(properties?.["$current_url"]
					? { $current_url: properties["$current_url"] }
					: {}),
				_truncated: true,
				_original_size: serialized.length,
			},
		} as T;
	} catch {
		return event;
	}
}

/**
 * Signature compatible posthog-js `BeforeSendFn` (`(cr: CaptureResult | null) => CaptureResult | null`)
 * et posthog-node `before_send`. On ne contraint pas le type pour rester structurellement
 * compatible avec les deux SDK sans dépendance de types.
 *
 * Retourner `null` drop l'event. Ici on ne drop jamais, on masque uniquement.
 */
export function scrubPII<T>(event: T): T {
	if (!event || typeof event !== "object") return event;
	const scrubbed = scrubObject(event as unknown as AnyRecord);
	return truncateIfOversized(scrubbed) as unknown as T;
}
