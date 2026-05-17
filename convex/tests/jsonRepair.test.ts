/**
 * Tests unitaires de repairTruncatedJson (P2/O12).
 *
 * Couvre les cas réels de troncature LLM :
 * - Object/array fermé naturellement
 * - Object tronqué en pleine chaîne
 * - Stack imbriquée profonde
 * - Délimiteurs internes aux chaînes (faux positifs)
 * - Trailing commas
 */

// @ts-ignore
import { describe, it, expect } from "vitest";
import { repairTruncatedJson, parseOrRepairJson } from "../lib/jsonRepair";

describe("repairTruncatedJson", () => {
  it("ne touche pas un JSON déjà bien formé (object)", () => {
    const input = '{"a": 1, "b": [2, 3]}';
    const repaired = repairTruncatedJson(input);
    expect(JSON.parse(repaired)).toEqual({ a: 1, b: [2, 3] });
  });

  it("ferme une accolade manquante", () => {
    const input = '{"a": 1, "b": 2';
    const repaired = repairTruncatedJson(input);
    expect(JSON.parse(repaired)).toEqual({ a: 1, b: 2 });
  });

  it("ferme un crochet de tableau manquant", () => {
    const input = '[1, 2, 3';
    const repaired = repairTruncatedJson(input);
    expect(JSON.parse(repaired)).toEqual([1, 2, 3]);
  });

  it("ferme des structures imbriquées dans l'ordre LIFO", () => {
    const input = '{"a": {"b": [1, 2';
    const repaired = repairTruncatedJson(input);
    expect(JSON.parse(repaired)).toEqual({ a: { b: [1, 2] } });
  });

  it("ne ferme PAS les accolades à l'intérieur des chaînes", () => {
    // La chaîne "{interne}" ne doit pas affecter le compteur de stack
    const input = '{"url": "https://example.com/{path}", "x": 1';
    const repaired = repairTruncatedJson(input);
    expect(JSON.parse(repaired)).toEqual({
      url: "https://example.com/{path}",
      x: 1,
    });
  });

  it("respecte les caractères échappés dans les chaînes", () => {
    const input = '{"msg": "He said \\"hi\\"", "ok": true';
    const repaired = repairTruncatedJson(input);
    expect(JSON.parse(repaired)).toEqual({
      msg: 'He said "hi"',
      ok: true,
    });
  });

  it("retire une trailing comma", () => {
    const input = '{"a": 1, "b": 2,';
    const repaired = repairTruncatedJson(input);
    expect(JSON.parse(repaired)).toEqual({ a: 1, b: 2 });
  });

  it("récupère un objet tronqué en pleine chaîne (cas Gemini fréquent)", () => {
    // Chaîne coupée brutalement dans la valeur — on coupe au dernier safe point
    const input = '{"items": [{"name": "Société A"}, {"name": "Société';
    const repaired = repairTruncatedJson(input);
    const parsed = JSON.parse(repaired) as { items: Array<{ name: string }> };
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]).toEqual({ name: "Société A" });
  });

  it("gère un tableau d'objets tronqué", () => {
    const input = '[{"id": 1, "name": "a"}, {"id": 2, "name": "b"';
    const repaired = repairTruncatedJson(input);
    const parsed = JSON.parse(repaired) as Array<{ id: number; name: string }>;
    expect(parsed).toHaveLength(2);
  });

  it("gère 3 niveaux d'imbrication tronqués", () => {
    const input = '{"a": {"b": {"c": [1, 2, {"d": "e"';
    const repaired = repairTruncatedJson(input);
    expect(JSON.parse(repaired)).toEqual({
      a: { b: { c: [1, 2, { d: "e" }] } },
    });
  });

  it("ignore les délimiteurs internes même avec escapes complexes", () => {
    const input = String.raw`{"path": "C:\\Users\\{name}\\file.json", "ok": true`;
    const repaired = repairTruncatedJson(input);
    expect(JSON.parse(repaired)).toEqual({
      path: "C:\\Users\\{name}\\file.json",
      ok: true,
    });
  });
});

describe("parseOrRepairJson", () => {
  it("parse direct si JSON valide", () => {
    expect(parseOrRepairJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it("répare et parse un JSON tronqué", () => {
    expect(parseOrRepairJson('{"a": 1, "b": [2, 3')).toEqual({
      a: 1,
      b: [2, 3],
    });
  });

  it("lève une erreur si le JSON est inrécupérable", () => {
    expect(() => parseOrRepairJson("not json at all")).toThrow();
  });
});
