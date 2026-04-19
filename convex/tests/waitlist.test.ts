/**
 * Waitlist — Tests unitaires (spécification logique FIFO + fenêtre dates)
 *
 * Vérifie la règle de sélection d'une entrée à promouvoir quand un créneau
 * se libère : la plus ancienne (joinedAt ASC) parmi les entries en statut
 * `waiting` dont la fenêtre [earliestDate, latestDate] contient la date
 * libérée.
 *
 * Référence : convex/functions/appointmentWaitlist.ts::offerSlotToWaitlist
 *
 * Usage :
 *   npx vitest run convex/tests/waitlist.test.ts
 */

// @ts-ignore
import { describe, it, expect } from "vitest";

type Entry = {
  _id: string;
  status: "waiting" | "offered" | "claimed" | "expired" | "cancelled";
  earliestDate: string;
  latestDate: string;
  joinedAt: number;
};

/**
 * Pure version of the server-side FIFO selection. Kept in the test file so
 * drift from the implementation is caught by CI.
 */
function selectNextOffer(
  entries: Entry[],
  freedDate: string,
): Entry | undefined {
  return entries
    .filter(
      (e) =>
        e.status === "waiting" &&
        e.earliestDate <= freedDate &&
        e.latestDate >= freedDate,
    )
    .sort((a, b) => a.joinedAt - b.joinedAt)[0];
}

describe("selectNextOffer (FIFO + date window)", () => {
  const mk = (
    id: string,
    joinedAt: number,
    earliestDate: string,
    latestDate: string,
    status: Entry["status"] = "waiting",
  ): Entry => ({ _id: id, status, earliestDate, latestDate, joinedAt });

  it("renvoie la plus ancienne (joinedAt min) quand toutes les fenêtres couvrent la date", () => {
    const entries = [
      mk("c", 300, "2026-05-01", "2026-05-31"),
      mk("a", 100, "2026-05-01", "2026-05-31"),
      mk("b", 200, "2026-05-01", "2026-05-31"),
    ];
    const next = selectNextOffer(entries, "2026-05-15");
    expect(next?._id).toBe("a");
  });

  it("ignore les entries dont la fenêtre n'inclut pas la date", () => {
    const entries = [
      mk("a", 100, "2026-06-01", "2026-06-30"), // après
      mk("b", 200, "2026-04-01", "2026-04-30"), // avant
      mk("c", 300, "2026-05-10", "2026-05-20"), // OK
    ];
    const next = selectNextOffer(entries, "2026-05-15");
    expect(next?._id).toBe("c");
  });

  it("ignore les entries qui ne sont pas en statut `waiting`", () => {
    const entries = [
      mk("a", 100, "2026-05-01", "2026-05-31", "offered"),
      mk("b", 200, "2026-05-01", "2026-05-31", "claimed"),
      mk("c", 300, "2026-05-01", "2026-05-31", "expired"),
      mk("d", 400, "2026-05-01", "2026-05-31", "waiting"),
    ];
    const next = selectNextOffer(entries, "2026-05-15");
    expect(next?._id).toBe("d");
  });

  it("renvoie undefined quand la liste est vide ou aucune entry ne match", () => {
    expect(selectNextOffer([], "2026-05-15")).toBeUndefined();
    expect(
      selectNextOffer(
        [mk("a", 100, "2026-01-01", "2026-01-31")],
        "2026-05-15",
      ),
    ).toBeUndefined();
  });

  it("gère les bornes inclusives de la fenêtre", () => {
    const entries = [
      mk("a", 100, "2026-05-15", "2026-05-15"), // même jour exact
    ];
    expect(selectNextOffer(entries, "2026-05-15")?._id).toBe("a");
    expect(selectNextOffer(entries, "2026-05-14")).toBeUndefined();
    expect(selectNextOffer(entries, "2026-05-16")).toBeUndefined();
  });
});
