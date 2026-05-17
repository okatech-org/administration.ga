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
  buildCorrespondanceSearchText,
  canGradeReadConfidentiality,
  GRADE_ORDER,
  CONFIDENTIALITY_MIN_GRADE,
  applyReferencePattern,
} from "../lib/correspondanceHelpers";
import { buildDocumentSearchText } from "../lib/documentHelpers";

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
    "transmis",
    "retourne",
  ];

  const VALID_RETURNED_CATEGORIES = [
    "incomplete",
    "rejected",
    "wrong_recipient",
    "other",
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

  it("7 statuts de suivi destinataire (incluant transmis et retourne)", () => {
    expect(VALID_RECIPIENT_STATUSES).toHaveLength(7);
  });

  it("le flux destinataire de base suit l'ordre logique", () => {
    // en_transit → recu → en_attente → approuve → repondu
    const baseOrder = ["en_transit", "recu", "en_attente", "approuve", "repondu"];
    expect(VALID_RECIPIENT_STATUSES.slice(0, 5)).toEqual(baseOrder);
  });

  it("transmis et retourne sont des statuts terminaux de circulation", () => {
    expect(VALID_RECIPIENT_STATUSES).toContain("transmis");
    expect(VALID_RECIPIENT_STATUSES).toContain("retourne");
  });

  it("4 catégories de motif de renvoi", () => {
    expect(VALID_RETURNED_CATEGORIES).toHaveLength(4);
    expect(VALID_RETURNED_CATEGORIES).toContain("incomplete");
    expect(VALID_RETURNED_CATEGORIES).toContain("rejected");
    expect(VALID_RETURNED_CATEGORIES).toContain("wrong_recipient");
    expect(VALID_RETURNED_CATEGORIES).toContain("other");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SEARCH TEXT — Couverture des nouveaux tags de circulation
// ═════════════════════════════════════════════════════════════════════════════

describe("buildCorrespondanceSearchText — circulation des dossiers", () => {
  it("inclut les tags de transmission (transmis, from:REF) pour search full-text", () => {
    const result = buildCorrespondanceSearchText({
      title: "Note transmise",
      reference: "DIPL/2026/NV/00100",
      tags: ["transmis", "from:DIPL/2026/NV/00042"],
      comment: "Transmis par Ambassade Madrid. Origine : MAE Paris (DIPL/2026/NV/00042).",
    });
    expect(result).toContain("transmis");
    expect(result).toContain("from:DIPL/2026/NV/00042");
    expect(result).toContain("Ambassade Madrid");
  });

  it("inclut les tags de renvoi (renvoi, catégorie) pour search full-text", () => {
    const result = buildCorrespondanceSearchText({
      title: "[Renvoi] Note Verbale",
      reference: "DIPL/2026/NV/00200",
      tags: ["renvoi", "incomplete"],
      comment: "RENVOI [incomplete] — Pièce justificative manquante (origine : DIPL/2026/NV/00042)",
    });
    expect(result).toContain("renvoi");
    expect(result).toContain("incomplete");
    expect(result).toContain("Pièce justificative manquante");
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

// ═════════════════════════════════════════════════════════════════════════════
// SEARCH TEXT (champ dénormalisé pour la recherche full-text)
// ═════════════════════════════════════════════════════════════════════════════

describe("buildCorrespondanceSearchText", () => {
  it("concatène tous les champs présents avec un espace", () => {
    const result = buildCorrespondanceSearchText({
      title: "Visite officielle",
      reference: "DIPL/2026/NV/00042",
      senderName: "Ambassade du Gabon",
      senderOrg: "Mission Permanente",
      recipientName: "Ministère des Affaires Étrangères",
      recipientOrg: "République Française",
      comment: "Demande de rendez-vous protocolaire",
      tags: ["urgent", "protocole"],
    });

    expect(result).toContain("Visite officielle");
    expect(result).toContain("DIPL/2026/NV/00042");
    expect(result).toContain("Ambassade du Gabon");
    expect(result).toContain("Mission Permanente");
    expect(result).toContain("Ministère des Affaires Étrangères");
    expect(result).toContain("République Française");
    expect(result).toContain("rendez-vous protocolaire");
    expect(result).toContain("urgent");
    expect(result).toContain("protocole");
  });

  it("ignore les champs absents (undefined/null) sans erreur", () => {
    const result = buildCorrespondanceSearchText({
      title: "Note Verbale",
      reference: "DIPL/2026/NV/001",
    });
    expect(result).toBe("Note Verbale DIPL/2026/NV/001");
  });

  it("ignore un tableau de tags vide", () => {
    const result = buildCorrespondanceSearchText({
      title: "Test",
      tags: [],
    });
    expect(result).toBe("Test");
  });

  it("inclut arrivalReference si fourni (cas post-réception)", () => {
    const result = buildCorrespondanceSearchText({
      title: "Note reçue",
      reference: "DIPL/2026/NV/00001",
      arrivalReference: "ARR/2026/00042",
    });
    expect(result).toContain("ARR/2026/00042");
  });

  it("retourne une chaîne vide pour un input entièrement vide", () => {
    expect(buildCorrespondanceSearchText({})).toBe("");
  });

  it("trim les espaces en bordure (cas où seul tags est présent)", () => {
    const result = buildCorrespondanceSearchText({
      tags: ["solo"],
    });
    expect(result).toBe("solo");
  });

  it("préserve l'ordre title → reference → sender → recipient → comment → arrivalRef → tags", () => {
    const result = buildCorrespondanceSearchText({
      title: "T",
      reference: "R",
      senderName: "SN",
      senderOrg: "SO",
      recipientName: "RN",
      recipientOrg: "RO",
      comment: "C",
      arrivalReference: "AR",
      tags: ["TAG1", "TAG2"],
    });
    expect(result).toBe("T R SN SO RN RO C AR TAG1 TAG2");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// HABILITATION PAR NIVEAU DE CONFIDENTIALITÉ (fonction pure)
// ═════════════════════════════════════════════════════════════════════════════

describe("canGradeReadConfidentiality", () => {
  describe("niveau standard", () => {
    it("autorise tous les grades, y compris external", () => {
      for (const grade of GRADE_ORDER) {
        expect(canGradeReadConfidentiality(grade, "standard")).toBe(true);
      }
    });

    it("autorise même quand confidentialite est undefined (defaut = standard)", () => {
      expect(canGradeReadConfidentiality("external", undefined)).toBe(true);
    });
  });

  describe("niveau confidentiel (min = secretary)", () => {
    it("rejette external", () => {
      expect(canGradeReadConfidentiality("external", "confidentiel")).toBe(false);
    });

    it("rejette agent", () => {
      expect(canGradeReadConfidentiality("agent", "confidentiel")).toBe(false);
    });

    it("autorise secretary (seuil minimum)", () => {
      expect(canGradeReadConfidentiality("secretary", "confidentiel")).toBe(true);
    });

    it("autorise tous les grades >= secretary", () => {
      for (const grade of ["secretary", "counselor", "deputy_chief", "chief"] as const) {
        expect(canGradeReadConfidentiality(grade, "confidentiel")).toBe(true);
      }
    });
  });

  describe("niveau secret (min = deputy_chief)", () => {
    it("rejette external, agent, secretary, counselor", () => {
      for (const grade of ["external", "agent", "secretary", "counselor"] as const) {
        expect(canGradeReadConfidentiality(grade, "secret")).toBe(false);
      }
    });

    it("autorise deputy_chief (seuil minimum)", () => {
      expect(canGradeReadConfidentiality("deputy_chief", "secret")).toBe(true);
    });

    it("autorise chief", () => {
      expect(canGradeReadConfidentiality("chief", "secret")).toBe(true);
    });
  });

  describe("niveau inconnu (defensive)", () => {
    it("traite un niveau non reconnu comme deputy_chief minimum", () => {
      // Comportement défensif : si on ajoute un niveau et qu'on oublie la map,
      // on tombe sur deputy_chief par défaut (plutôt que d'autoriser largement)
      expect(canGradeReadConfidentiality("agent", "top_secret_xyz")).toBe(false);
      expect(canGradeReadConfidentiality("deputy_chief", "top_secret_xyz")).toBe(true);
    });
  });

  describe("invariants de la matrice CONFIDENTIALITY_MIN_GRADE", () => {
    it("standard a le seuil le plus bas", () => {
      const standardIdx = GRADE_ORDER.indexOf(CONFIDENTIALITY_MIN_GRADE.standard);
      const confidentielIdx = GRADE_ORDER.indexOf(CONFIDENTIALITY_MIN_GRADE.confidentiel);
      expect(standardIdx).toBeLessThan(confidentielIdx);
    });

    it("secret a le seuil le plus haut", () => {
      const confidentielIdx = GRADE_ORDER.indexOf(CONFIDENTIALITY_MIN_GRADE.confidentiel);
      const secretIdx = GRADE_ORDER.indexOf(CONFIDENTIALITY_MIN_GRADE.secret);
      expect(secretIdx).toBeGreaterThan(confidentielIdx);
    });

    it("les seuils sont strictement croissants : standard < confidentiel < secret", () => {
      const standardIdx = GRADE_ORDER.indexOf(CONFIDENTIALITY_MIN_GRADE.standard);
      const confidentielIdx = GRADE_ORDER.indexOf(CONFIDENTIALITY_MIN_GRADE.confidentiel);
      const secretIdx = GRADE_ORDER.indexOf(CONFIDENTIALITY_MIN_GRADE.secret);
      expect(standardIdx).toBeLessThan(confidentielIdx);
      expect(confidentielIdx).toBeLessThan(secretIdx);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATTERN DE RÉFÉRENCE (Sprint 2 — B2)
// ═════════════════════════════════════════════════════════════════════════════

describe("applyReferencePattern", () => {
  it("remplace les tokens YYYY, YY, TYPE, NNNNN", () => {
    const result = applyReferencePattern(
      "DIPL/{YYYY}/{TYPE}/{NNNNN}",
      { year: 2026, typeCode: "NV", sequence: 42 },
    );
    expect(result).toBe("DIPL/2026/NV/00042");
  });

  it("supporte le token {YY} en année 2 chiffres", () => {
    expect(
      applyReferencePattern("FR-{YY}-{NN}", {
        year: 2026,
        typeCode: "L",
        sequence: 3,
      }),
    ).toBe("FR-26-03");
  });

  it("ajuste le padding au nombre de N dans le token", () => {
    const vars = { year: 2026, typeCode: "X", sequence: 7 };
    expect(applyReferencePattern("a-{N}-b", vars)).toBe("a-7-b");
    expect(applyReferencePattern("a-{NN}-b", vars)).toBe("a-07-b");
    expect(applyReferencePattern("a-{NNNN}-b", vars)).toBe("a-0007-b");
    expect(applyReferencePattern("a-{NNNNNNN}-b", vars)).toBe("a-0000007-b");
  });

  it("ne tronque pas si la séquence dépasse la largeur de padding", () => {
    expect(
      applyReferencePattern("{NN}", { year: 2026, typeCode: "X", sequence: 12345 }),
    ).toBe("12345");
  });

  it("remplace toutes les occurrences d'un même token", () => {
    expect(
      applyReferencePattern("{YYYY}-{YYYY}-{TYPE}", {
        year: 2026,
        typeCode: "Z",
        sequence: 1,
      }),
    ).toBe("2026-2026-Z");
  });

  it("laisse intacts les caractères non-tokens (slash, dash, espaces)", () => {
    expect(
      applyReferencePattern("Mémo / {YYYY} | n° {NN}", {
        year: 2026,
        typeCode: "MEM",
        sequence: 9,
      }),
    ).toBe("Mémo / 2026 | n° 09");
  });

  it("est insensible à un type vide (typeCode = '')", () => {
    expect(
      applyReferencePattern("{YYYY}/{TYPE}/{NN}", {
        year: 2026,
        typeCode: "",
        sequence: 4,
      }),
    ).toBe("2026//04");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SEARCH TEXT iDOCUMENT (Phase 1 — alignement iDoc ↔ iCorr)
// ═════════════════════════════════════════════════════════════════════════════

describe("buildDocumentSearchText", () => {
  it("concatène label + category + filenames + tags + origin", () => {
    const result = buildDocumentSearchText({
      label: "Mémo accréditation Ambassadeur",
      category: "consulaire",
      documentType: "memorandum",
      files: [{ filename: "memo-2026.pdf" }, { filename: "annexe.pdf" }],
      tags: ["source:correspondance", "urgent"],
      origin: {
        senderName: "MAE Paris",
        recipientName: "Ambassade Gabon",
        correspondanceReference: "DIPL/2026/MEM/00042",
        correspondanceArrivalRef: "ARR/2026/00018",
      },
    });
    expect(result).toContain("Mémo accréditation");
    expect(result).toContain("consulaire");
    expect(result).toContain("memo-2026.pdf");
    expect(result).toContain("annexe.pdf");
    expect(result).toContain("source:correspondance");
    expect(result).toContain("MAE Paris");
    expect(result).toContain("DIPL/2026/MEM/00042");
    expect(result).toContain("ARR/2026/00018");
  });

  it("tolère un input vide", () => {
    expect(buildDocumentSearchText({})).toBe("");
  });

  it("tolère l'absence de tags / files / origin", () => {
    expect(
      buildDocumentSearchText({
        label: "Note interne",
        category: "interne",
      }),
    ).toBe("Note interne interne");
  });

  it("ne crashe pas sur des filenames vides", () => {
    expect(
      buildDocumentSearchText({
        label: "X",
        files: [{ filename: "" }, { filename: "ok.pdf" }],
      }),
    ).toBe("X ok.pdf");
  });

  it("tronque à 8000 caractères pour rester sous la limite searchIndex", () => {
    const big = "a".repeat(10_000);
    const result = buildDocumentSearchText({ label: big });
    expect(result.length).toBe(8000);
  });

  it("préserve l'ordre label → origin", () => {
    const result = buildDocumentSearchText({
      label: "AAA",
      origin: { senderName: "ZZZ" },
    });
    expect(result.indexOf("AAA")).toBeLessThan(result.indexOf("ZZZ"));
  });
});
