/**
 * Affaires Diplomatiques — Tests unitaires de la state machine
 *
 * Tests purs (sans Convex runtime) pour la matrice de transitions du pipeline
 * et les helpers de dedoublonnage / validation.
 *
 * Usage :
 *   npx vitest run convex/tests/diplomatic-pipeline.test.ts
 *   npx vitest watch convex/tests/diplomatic-pipeline.test.ts
 */

// @ts-ignore
import { describe, it, expect } from "vitest";
import {
  PIPELINE_PHASES,
  PIPELINE_TRANSITIONS,
  isValidPipelineTransition,
  assertValidPipelineTransition,
  getNextPhase,
  isTerminalPhase,
  normalizeTargetName,
  isValidTargetType,
  isValidTargetPriority,
  isValidPlanCategory,
  TARGET_TYPES,
  TARGET_PRIORITIES,
  PLAN_CATEGORIES,
} from "../lib/diplomaticPipelineHelpers";

// ═════════════════════════════════════════════════════════════════════════════
// PHASES DU PIPELINE
// ═════════════════════════════════════════════════════════════════════════════

describe("PIPELINE_PHASES", () => {
  it("contient les 5 phases dans l'ordre canonique", () => {
    expect(PIPELINE_PHASES).toEqual([
      "targeting",
      "strategy",
      "outreach",
      "reporting",
      "project",
    ]);
  });

  it("chaque phase a une entrée dans PIPELINE_TRANSITIONS", () => {
    for (const phase of PIPELINE_PHASES) {
      expect(PIPELINE_TRANSITIONS[phase]).toBeDefined();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MATRICE DE TRANSITIONS
// ═════════════════════════════════════════════════════════════════════════════

describe("isValidPipelineTransition — transitions autorisées", () => {
  const validTransitions: Array<[string, string]> = [
    // Avancement linéaire
    ["targeting", "strategy"],
    ["strategy", "outreach"],
    ["outreach", "reporting"],
    ["reporting", "project"],
    // Retours en arrière autorisés
    ["strategy", "targeting"],
    ["outreach", "strategy"],
    ["reporting", "outreach"],
  ];

  for (const [from, to] of validTransitions) {
    it(`autorise ${from} → ${to}`, () => {
      expect(isValidPipelineTransition(from, to)).toBe(true);
    });
  }
});

describe("isValidPipelineTransition — transitions interdites", () => {
  const invalidTransitions: Array<[string, string]> = [
    // Pas de saut de phase (skip)
    ["targeting", "outreach"],
    ["targeting", "reporting"],
    ["targeting", "project"],
    ["strategy", "reporting"],
    ["strategy", "project"],
    ["outreach", "project"],
    // Retours non autorisés (multi-step backwards)
    ["outreach", "targeting"],
    ["reporting", "strategy"],
    ["reporting", "targeting"],
    // project est terminale
    ["project", "targeting"],
    ["project", "strategy"],
    ["project", "outreach"],
    ["project", "reporting"],
    // Transitions vers une phase identique = pas autorisé
    ["targeting", "targeting"],
    ["strategy", "strategy"],
    ["project", "project"],
  ];

  for (const [from, to] of invalidTransitions) {
    it(`refuse ${from} → ${to}`, () => {
      expect(isValidPipelineTransition(from, to)).toBe(false);
    });
  }
});

describe("isValidPipelineTransition — cas limites", () => {
  it("traite undefined comme targeting (cible legacy sans phase)", () => {
    expect(isValidPipelineTransition(undefined, "strategy")).toBe(true);
    expect(isValidPipelineTransition(undefined, "outreach")).toBe(false);
  });

  it("refuse une phase source inconnue", () => {
    expect(isValidPipelineTransition("unknown", "strategy")).toBe(false);
  });

  it("refuse une phase cible inconnue", () => {
    expect(isValidPipelineTransition("targeting", "unknown")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ASSERTION
// ═════════════════════════════════════════════════════════════════════════════

describe("assertValidPipelineTransition", () => {
  it("ne lève pas pour une transition valide", () => {
    expect(() =>
      assertValidPipelineTransition("targeting", "strategy"),
    ).not.toThrow();
  });

  it("lève une erreur avec un message clair pour une transition invalide", () => {
    expect(() =>
      assertValidPipelineTransition("targeting", "project"),
    ).toThrow(/Transition invalide.*targeting.*project/);
  });

  it("mentionne les transitions autorisées dans le message d'erreur", () => {
    try {
      assertValidPipelineTransition("targeting", "outreach");
      expect.fail("Aurait dû lever une erreur");
    } catch (err) {
      // ConvexError encapsule la donnée dans .data
      const message =
        err instanceof Error
          ? // @ts-ignore — ConvexError.data
            err.data ?? err.message
          : String(err);
      expect(message).toContain("strategy");
    }
  });

  it("indique 'phase finale' depuis project", () => {
    try {
      assertValidPipelineTransition("project", "reporting");
      expect.fail("Aurait dû lever une erreur");
    } catch (err) {
      const message =
        err instanceof Error
          ? // @ts-ignore — ConvexError.data
            err.data ?? err.message
          : String(err);
      expect(message).toContain("aucune");
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AVANCEMENT NATUREL
// ═════════════════════════════════════════════════════════════════════════════

describe("getNextPhase", () => {
  it("retourne la phase d'avancement naturelle (1re transition)", () => {
    expect(getNextPhase("targeting")).toBe("strategy");
    expect(getNextPhase("strategy")).toBe("outreach");
    expect(getNextPhase("outreach")).toBe("reporting");
    expect(getNextPhase("reporting")).toBe("project");
  });

  it("retourne null pour la phase terminale", () => {
    expect(getNextPhase("project")).toBeNull();
  });

  it("traite undefined comme targeting", () => {
    expect(getNextPhase(undefined)).toBe("strategy");
  });

  it("retourne null pour une phase inconnue", () => {
    expect(getNextPhase("unknown")).toBeNull();
  });
});

describe("isTerminalPhase", () => {
  it("project est terminale", () => {
    expect(isTerminalPhase("project")).toBe(true);
  });

  it("aucune autre phase n'est terminale", () => {
    expect(isTerminalPhase("targeting")).toBe(false);
    expect(isTerminalPhase("strategy")).toBe(false);
    expect(isTerminalPhase("outreach")).toBe(false);
    expect(isTerminalPhase("reporting")).toBe(false);
  });

  it("une phase inconnue est considérée terminale (sécurité)", () => {
    expect(isTerminalPhase("unknown")).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DEDOUBLONNAGE
// ═════════════════════════════════════════════════════════════════════════════

describe("normalizeTargetName", () => {
  it("supprime les espaces en début/fin", () => {
    expect(normalizeTargetName("  Acme Corp  ")).toBe("acme corp");
  });

  it("met en minuscules", () => {
    expect(normalizeTargetName("ACME CORP")).toBe("acme corp");
  });

  it("normalise les espaces multiples", () => {
    expect(normalizeTargetName("Acme    Corp")).toBe("acme corp");
  });

  it("détecte les doublons malgré différentes casses et espaces", () => {
    expect(normalizeTargetName("Acme Corp")).toBe(
      normalizeTargetName("acme    corp"),
    );
    expect(normalizeTargetName("  ACME Corp ")).toBe(
      normalizeTargetName("acme corp"),
    );
  });

  it("préserve les caractères accentués (FR/ES)", () => {
    expect(normalizeTargetName("Société Générale")).toBe("société générale");
    expect(normalizeTargetName("José María")).toBe("josé maría");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATEURS PURS
// ═════════════════════════════════════════════════════════════════════════════

describe("isValidTargetType", () => {
  it("accepte tous les types canoniques", () => {
    for (const type of TARGET_TYPES) {
      expect(isValidTargetType(type)).toBe(true);
    }
  });

  it("refuse les types inconnus", () => {
    expect(isValidTargetType("Enterprise")).toBe(false); // case-sensitive
    expect(isValidTargetType("startup")).toBe(false);
    expect(isValidTargetType("")).toBe(false);
  });
});

describe("isValidTargetPriority", () => {
  it("accepte toutes les priorités canoniques", () => {
    for (const priority of TARGET_PRIORITIES) {
      expect(isValidTargetPriority(priority)).toBe(true);
    }
  });

  it("refuse les priorités inconnues", () => {
    expect(isValidTargetPriority("urgent")).toBe(false);
    expect(isValidTargetPriority("HIGH")).toBe(false); // case-sensitive
    expect(isValidTargetPriority("")).toBe(false);
  });
});

describe("isValidPlanCategory", () => {
  it("accepte toutes les catégories canoniques", () => {
    for (const category of PLAN_CATEGORIES) {
      expect(isValidPlanCategory(category)).toBe(true);
    }
  });

  it("refuse les catégories inconnues", () => {
    expect(isValidPlanCategory("commercial")).toBe(false);
    expect(isValidPlanCategory("Bilateral")).toBe(false); // case-sensitive
    expect(isValidPlanCategory("")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SCÉNARIO COMPLET : parcours d'une cible à travers le pipeline
// ═════════════════════════════════════════════════════════════════════════════

describe("Scénario : parcours complet d'une cible", () => {
  it("autorise le parcours linéaire targeting → strategy → outreach → reporting → project", () => {
    const journey = [
      ["targeting", "strategy"],
      ["strategy", "outreach"],
      ["outreach", "reporting"],
      ["reporting", "project"],
    ] as const;

    for (const [from, to] of journey) {
      expect(isValidPipelineTransition(from, to)).toBe(true);
    }
  });

  it("autorise un retour en arrière puis reprise (strategy → targeting → strategy)", () => {
    expect(isValidPipelineTransition("strategy", "targeting")).toBe(true);
    expect(isValidPipelineTransition("targeting", "strategy")).toBe(true);
  });

  it("bloque toute action après project (phase terminale)", () => {
    for (const phase of PIPELINE_PHASES) {
      expect(isValidPipelineTransition("project", phase)).toBe(false);
    }
  });
});
