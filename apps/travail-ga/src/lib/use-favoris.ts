"use client";

/**
 * Persistance des offres mises en favoris — TRAVAIL.GA.
 *
 * Stocké côté navigateur uniquement (localStorage). TRAVAIL.GA est une
 * vitrine publique sans schéma utilisateur dédié aux favoris : les vrais
 * favoris D.E sont gérés côté PNPE.GA. Ce hook offre néanmoins un
 * comportement utile et persistant pour les visiteurs anonymes.
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "travail-ga:favoris";
const EVENT_NAME = "travail-ga:favoris:changed";

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useFavoris() {
  const [refs, setRefs] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setRefs(readSet());
    const handler = () => setRefs(readSet());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const isFavori = useCallback((reference: string) => refs.has(reference), [refs]);

  const toggle = useCallback((reference: string) => {
    const next = new Set(readSet());
    if (next.has(reference)) next.delete(reference);
    else next.add(reference);
    writeSet(next);
  }, []);

  return { isFavori, toggle, count: refs.size };
}
