/**
 * iCal (.ics) export utilities for appointments.
 *
 * - HMAC-signed tokens let the .ics URL be shared without exposing a session.
 *   Token shape: base64url(JSON.stringify({apt, exp})) + "." + base64url(hmac)
 * - Secret read from process.env.ICAL_HMAC_SECRET, with a dev fallback.
 */

const ENCODER = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(normalized);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function getSecret(): string {
  return (
    process.env.ICAL_HMAC_SECRET ??
    process.env.CONVEX_SITE_URL ??
    "dev-ical-hmac-secret-do-not-use-in-prod"
  );
}

async function hmacSha256(data: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, ENCODER.encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signAppointmentIcalToken(
  appointmentId: string,
  expiresAtMs: number,
): Promise<string> {
  const payload = JSON.stringify({ apt: appointmentId, exp: expiresAtMs });
  const payloadB64 = base64url(ENCODER.encode(payload));
  const sig = await hmacSha256(payloadB64, getSecret());
  return `${payloadB64}.${base64url(sig)}`;
}

export async function verifyAppointmentIcalToken(
  token: string,
): Promise<{ appointmentId: string } | null> {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;
  const expected = await hmacSha256(payloadB64, getSecret());
  const got = base64urlDecode(sigB64);
  if (!timingSafeEqual(expected, got)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64))) as {
      apt: string;
      exp: number;
    };
    if (typeof payload.apt !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return { appointmentId: payload.apt };
  } catch {
    return null;
  }
}

function escapeIcsText(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsDate(dateStr: string, timeStr: string): string {
  // Local time format (no Z suffix, no TZID for MVP — floating time).
  // dateStr = YYYY-MM-DD, timeStr = HH:MM
  const [y, m, d] = dateStr.split("-");
  const [hh, mm] = timeStr.split(":");
  return `${y}${m}${d}T${hh}${mm}00`;
}

function toIcsUtc(ms: number): string {
  const dt = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`;
}

export function buildAppointmentIcs(params: {
  appointmentId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  status: "confirmed" | "cancelled" | "tentative";
}): string {
  const now = Date.now();
  const uid = `${params.appointmentId}@consulat.ga`;
  const dtStart = toIcsDate(params.date, params.startTime);
  const dtEnd = toIcsDate(params.date, params.endTime);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Consulat.ga//Appointments//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(params.summary)}`,
    params.description ? `DESCRIPTION:${escapeIcsText(params.description)}` : "",
    params.location ? `LOCATION:${escapeIcsText(params.location)}` : "",
    params.url ? `URL:${params.url}` : "",
    `STATUS:${params.status.toUpperCase()}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}
