/**
 * Validates the warehouse API key from the Authorization header.
 * Uses constant-time comparison to prevent timing attacks.
 * Fail-closed: returns false if the env var is not set.
 */
export function validateWarehouseApiKey(request: Request): boolean {
  const expectedKey = process.env.POSTHOG_WAREHOUSE_API_KEY;
  if (!expectedKey) return false;

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const providedKey = authHeader.slice(7);
  if (providedKey.length !== expectedKey.length) return false;

  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < expectedKey.length; i++) {
    mismatch |= providedKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }
  return mismatch === 0;
}
