/**
 * encryption.ts — Chiffrement AES-256-GCM pour les PII sensibles.
 *
 * Utilise Web Crypto API (disponible dans le runtime Convex).
 * Format de sortie : base64(iv):base64(ciphertext+authTag)
 * L'IV est aleatoire (12 octets) pour chaque chiffrement.
 *
 * Cle de chiffrement : FIELD_ENCRYPTION_KEY (base64, 32 octets = 256 bits)
 * Generer avec : node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

// ── Helpers base64 compatibles Convex runtime ──

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Importer la cle de chiffrement depuis l'environnement. */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyB64 = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyB64) {
    throw new Error("[Encryption] FIELD_ENCRYPTION_KEY manquant dans les variables d'environnement");
  }

  const keyBytes = fromBase64(keyB64);
  if (keyBytes.length !== 32) {
    throw new Error(`[Encryption] FIELD_ENCRYPTION_KEY doit faire 32 octets (recu ${keyBytes.length})`);
  }

  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Chiffrer une valeur PII en AES-256-GCM.
 * Retourne une chaine au format : base64(iv):base64(ciphertext+authTag)
 */
export async function encryptPii(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV (recommande GCM)
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encoded,
  );

  return `${toBase64(iv.buffer)}:${toBase64(ciphertext)}`;
}

/**
 * Dechiffrer une valeur PII chiffree par encryptPii.
 */
export async function decryptPii(encrypted: string): Promise<string> {
  const [ivB64, ciphertextB64] = encrypted.split(":");
  if (!ivB64 || !ciphertextB64) {
    throw new Error("[Encryption] Format invalide : attendu base64(iv):base64(ciphertext)");
  }

  const key = await getEncryptionKey();
  const iv = fromBase64(ivB64);
  const ciphertext = fromBase64(ciphertextB64);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer,
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Verifier si une chaine est deja chiffree (format iv:ciphertext).
 * Utile pour les migrations progressives.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 2) return false;
  try {
    fromBase64(parts[0]);
    fromBase64(parts[1]);
    return parts[0].length >= 16; // IV base64 d'au moins 12 octets
  } catch {
    return false;
  }
}
