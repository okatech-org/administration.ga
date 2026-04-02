/**
 * iCorrespondance — Tests unitaires
 *
 * Tests pour les helpers synchrones et la logique métier pure
 * du module iCorrespondance.
 *
 * Usage :
 *   npx vitest run convex/tests/correspondance.test.ts
 *   npx vitest watch convex/tests/correspondance.test.ts
 */

// @ts-ignore
import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  assertValidTransition,
} from "../lib/correspondanceHelpers";

// ═════════════════════════════════════════════════════════════════════════════
// MATRICE DE TRANSITIONS
// ═════════════════════════════════════════════════════════════════════════════

describe("isValidTransition", () => {
  // ── Transitions autorisées ──
  describe("transitions autorisées", () => {
    const validTransitions: [string, string][] = [
      // draft →
      ["draft", "pending"],
      ["draft", "sent"],
      ["draft", "archived"],
      // pending →
      ["pending", "draft"],
      ["pending", "approved"],
      ["pending", "rejected"],
      // approved →
      ["approved", "sent"],
      ["approved", "draft"],
      // rejected →
      ["rejected", "draft"],
      // sent →
      ["sent", "archived"],
      // received →
      ["received", "archived"],
    ];

    for (const [from, to] of validTransitions) {
      it(`autorise ${from} → ${to}`, () => {
        expect(isValidTransition(from, to)).toBe(true);
      });
    }
  });

  // ── Transitions interdites ──
  describe("transitions interdites", () => {
    const invalidTransitions: [string, string][] = [
      // Pas de retour en arrière depuis sent
      ["sent", "draft"],
      ["sent", "pending"],
      ["sent", "approved"],
      // archived est terminal
      ["archived", "draft"],
      ["archived", "sent"],
      ["archived", "pending"],
      // received ne peut pas devenir sent directement
      ["received", "sent"],
      ["received", "draft"],
      // draft ne peut pas devenir received ou approved directement
      ["draft", "received"],
      ["draft", "approved"],
      // rejected ne peut devenir que draft
      ["rejected", "sent"],
      ["rejected", "pending"],
      ["rejected", "approved"],
      // pending ne peut pas devenir sent directement
      ["pending", "sent"],
    ];

    for (const [from, to] of invalidTransitions) {
      it(`interdit ${from} → ${to}`, () => {
        expect(isValidTransition(from, to)).toBe(false);
      });
    }
  });

  // ── Cas limites ──
  describe("cas limites", () => {
    it("retourne false pour un statut source inconnu", () => {
      expect(isValidTransition("unknown", "draft")).toBe(false);
    });

    it("retourne false pour la même transition (no-op)", () => {
      expect(isValidTransition("draft", "draft")).toBe(false);
    });
  });
});

describe("assertValidTransition", () => {
  it("ne lève pas pour une transition valide", () => {
    expect(() => assertValidTransition("draft", "pending")).not.toThrow();
  });

  it("lève une ConvexError pour une transition invalide", () => {
    expect(() => assertValidTransition("archived", "draft")).toThrow();
  });

  it("inclut les détails dans le message d'erreur", () => {
    try {
      assertValidTransition("sent", "draft");
      expect.fail("devrait lever une erreur");
    } catch (e: any) {
      // ConvexError wraps the message
      const msg = e?.data ?? e?.message ?? String(e);
      expect(msg).toContain("sent");
      expect(msg).toContain("draft");
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// FLUX MÉTIER — Scénarios complets
// ═════════════════════════════════════════════════════════════════════════════

describe("scénarios de workflow", () => {
  it("flux standard : draft → pending → approved → sent → archived", () => {
    const statuses = ["draft", "pending", "approved", "sent", "archived"];
    for (let i = 0; i < statuses.length - 1; i++) {
      expect(isValidTransition(statuses[i], statuses[i + 1])).toBe(true);
    }
  });

  it("flux sans approbation : draft → sent → archived", () => {
    expect(isValidTransition("draft", "sent")).toBe(true);
    expect(isValidTransition("sent", "archived")).toBe(true);
  });

  it("flux rejet : pending → rejected → draft → pending", () => {
    expect(isValidTransition("pending", "rejected")).toBe(true);
    expect(isValidTransition("rejected", "draft")).toBe(true);
    expect(isValidTransition("draft", "pending")).toBe(true);
  });

  it("flux réception : received → archived", () => {
    expect(isValidTransition("received", "archived")).toBe(true);
  });

  it("retour pour modification : approved → draft", () => {
    expect(isValidTransition("approved", "draft")).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// FORMAT DE RÉFÉRENCE
// ═════════════════════════════════════════════════════════════════════════════

describe("format de référence diplomatique", () => {
  it("le format DIPL/YYYY/TYPE/NNNNN est valide", () => {
    const refPattern = /^DIPL\/\d{4}\/[A-Z]{2,3}\/\d{5}$/;

    expect(refPattern.test("DIPL/2026/NV/00042")).toBe(true);
    expect(refPattern.test("DIPL/2026/LO/00001")).toBe(true);
    expect(refPattern.test("DIPL/2026/CIR/00100")).toBe(true);
    expect(refPattern.test("DIPL/2026/TEL/99999")).toBe(true);
  });

  it("le format de registre arrivée ARR/YYYY/NNNNN est valide", () => {
    const arrPattern = /^ARR\/\d{4}\/\d{5}$/;

    expect(arrPattern.test("ARR/2026/00001")).toBe(true);
    expect(arrPattern.test("ARR/2026/00042")).toBe(true);
  });

  it("le format de registre départ DEP/YYYY/NNNNN est valide", () => {
    const depPattern = /^DEP\/\d{4}\/\d{5}$/;

    expect(depPattern.test("DEP/2026/00001")).toBe(true);
    expect(depPattern.test("DEP/2026/00042")).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TYPES DE CORRESPONDANCE
// ═════════════════════════════════════════════════════════════════════════════

describe("types de correspondance diplomatique", () => {
  const VALID_TYPES = [
    "note_verbale",
    "lettre_officielle",
    "circulaire",
    "telegramme",
    "memorandum",
    "communique",
  ];

  const VALID_PRIORITIES = ["normal", "urgent", "confidentiel"];

  const VALID_STATUSES = [
    "draft",
    "pending",
    "approved",
    "rejected",
    "sent",
    "received",
    "archived",
  ];

  const VALID_RECIPIENT_STATUSES = [
    "en_transit",
    "recu",
    "en_attente",
    "approuve",
    "repondu",
  ];

  it("6 types diplomatiques définis", () => {
    expect(VALID_TYPES).toHaveLength(6);
  });

  it("3 niveaux de priorité", () => {
    expect(VALID_PRIORITIES).toHaveLength(3);
  });

  it("7 statuts de correspondance (incluant rejected)", () => {
    expect(VALID_STATUSES).toHaveLength(7);
  });

  it("5 statuts de suivi destinataire", () => {
    expect(VALID_RECIPIENT_STATUSES).toHaveLength(5);
  });

  it("le flux destinataire suit l'ordre logique", () => {
    // en_transit → recu → en_attente → approuve → repondu
    const expectedOrder = ["en_transit", "recu", "en_attente", "approuve", "repondu"];
    expect(VALID_RECIPIENT_STATUSES).toEqual(expectedOrder);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// APPROBATION — Hiérarchie des grades
// ═════════════════════════════════════════════════════════════════════════════

describe("hiérarchie des grades diplomatiques", () => {
  const gradeOrder = ["external", "agent", "secretary", "counselor", "deputy_chief", "chief"];

  it("6 niveaux hiérarchiques définis", () => {
    expect(gradeOrder).toHaveLength(6);
  });

  it("chief est le grade le plus élevé", () => {
    expect(gradeOrder[gradeOrder.length - 1]).toBe("chief");
  });

  it("agent est au-dessus d'external", () => {
    expect(gradeOrder.indexOf("agent")).toBeGreaterThan(gradeOrder.indexOf("external"));
  });

  it("deputy_chief est juste en-dessous de chief", () => {
    expect(gradeOrder.indexOf("chief") - gradeOrder.indexOf("deputy_chief")).toBe(1);
  });

  it("un grade supérieur a un index plus élevé", () => {
    for (let i = 1; i < gradeOrder.length; i++) {
      expect(gradeOrder.indexOf(gradeOrder[i])).toBeGreaterThan(
        gradeOrder.indexOf(gradeOrder[i - 1]),
      );
    }
  });
});
