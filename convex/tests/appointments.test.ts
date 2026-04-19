/**
 * Appointments — Tests unitaires (pure helpers)
 *
 * Couvre :
 *   - Signature/vérification des tokens HMAC iCal (expiration, tampering)
 *   - Génération .ics (formatage champs obligatoires, échappement, TZ flottante)
 *
 * Les flows qui nécessitent Convex runtime (book, reschedule, waitlist offer,
 * notifications dispatch) sont testés via l'app preview + scripts de seed —
 * pas via convex-test ici car l'infra du repo utilise vitest pur.
 *
 * Usage :
 *   npx vitest run convex/tests/appointments.test.ts
 */

// @ts-ignore
import { describe, it, expect, beforeAll } from "vitest";
import {
  signAppointmentIcalToken,
  verifyAppointmentIcalToken,
  buildAppointmentIcs,
} from "../lib/ical";

beforeAll(() => {
  // Stabilise le secret pour les tests déterministes
  process.env.ICAL_HMAC_SECRET = "test-secret-deterministic";
});

// ═════════════════════════════════════════════════════════════════════════════
// TOKENS iCal HMAC
// ═════════════════════════════════════════════════════════════════════════════

describe("iCal HMAC tokens", () => {
  it("round-trip : signe puis vérifie le même appointmentId", async () => {
    const exp = Date.now() + 60_000;
    const token = await signAppointmentIcalToken("apt_abc123", exp);
    const decoded = await verifyAppointmentIcalToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.appointmentId).toBe("apt_abc123");
  });

  it("rejette un token expiré", async () => {
    const token = await signAppointmentIcalToken("apt_xyz", Date.now() - 1);
    const decoded = await verifyAppointmentIcalToken(token);
    expect(decoded).toBeNull();
  });

  it("rejette une signature altérée", async () => {
    const token = await signAppointmentIcalToken("apt_1", Date.now() + 60_000);
    const [payload, sig] = token.split(".");
    // flip le premier caractère (bits pleinement décodés, pas de padding)
    const first = sig[0];
    const flipped = first === "A" ? "B" : "A";
    const tampered = `${payload}.${flipped}${sig.slice(1)}`;
    const decoded = await verifyAppointmentIcalToken(tampered);
    expect(decoded).toBeNull();
  });

  it("rejette un payload altéré (signature ne matche plus)", async () => {
    const token = await signAppointmentIcalToken("apt_1", Date.now() + 60_000);
    const [_, sig] = token.split(".");
    // payload forgé — base64url("{\"apt\":\"other\",\"exp\":9999999999999}")
    const fakePayload = Buffer.from(
      JSON.stringify({ apt: "other", exp: Date.now() + 60_000 }),
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const decoded = await verifyAppointmentIcalToken(`${fakePayload}.${sig}`);
    expect(decoded).toBeNull();
  });

  it("rejette un token sans point séparateur", async () => {
    const decoded = await verifyAppointmentIcalToken("garbage-without-dot");
    expect(decoded).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GÉNÉRATION .ics
// ═════════════════════════════════════════════════════════════════════════════

describe("buildAppointmentIcs", () => {
  const base = {
    appointmentId: "apt_1",
    date: "2026-05-15",
    startTime: "09:30",
    endTime: "10:00",
    summary: "RDV Passeport",
    status: "confirmed" as const,
  };

  it("produit un VCALENDAR valide", () => {
    const ics = buildAppointmentIcs(base);
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics).toMatch(/END:VCALENDAR$/);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("VERSION:2.0");
  });

  it("inclut UID, DTSTART, DTEND au bon format (floating time)", () => {
    const ics = buildAppointmentIcs(base);
    expect(ics).toContain("UID:apt_1@consulat.ga");
    expect(ics).toContain("DTSTART:20260515T093000");
    expect(ics).toContain("DTEND:20260515T100000");
  });

  it("échappe les virgules, points-virgules et backslashes dans SUMMARY", () => {
    const ics = buildAppointmentIcs({
      ...base,
      summary: "RDV, avec ; et \\ backslash",
    });
    expect(ics).toContain(
      "SUMMARY:RDV\\, avec \\; et \\\\ backslash",
    );
  });

  it("omet les champs optionnels vides", () => {
    const ics = buildAppointmentIcs(base);
    expect(ics).not.toMatch(/^DESCRIPTION:$/m);
    expect(ics).not.toMatch(/^LOCATION:$/m);
    expect(ics).not.toMatch(/^URL:$/m);
  });

  it("inclut LOCATION et URL quand fournis", () => {
    const ics = buildAppointmentIcs({
      ...base,
      location: "Consulat, Paris",
      url: "https://consulat.ga/a/apt_1",
    });
    expect(ics).toContain("LOCATION:Consulat\\, Paris");
    expect(ics).toContain("URL:https://consulat.ga/a/apt_1");
  });

  it("mappe le statut en majuscules", () => {
    const ics = buildAppointmentIcs({ ...base, status: "cancelled" });
    expect(ics).toContain("STATUS:CANCELLED");
  });

  it("sépare les lignes par CRLF (RFC 5545)", () => {
    const ics = buildAppointmentIcs(base);
    expect(ics).toContain("\r\n");
  });
});
