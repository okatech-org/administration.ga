"use client";

/**
 * useGoogleMapsScript — Loader paresseux du script Google Maps JavaScript API.
 *
 * Charge `https://maps.googleapis.com/maps/api/js?...` une seule fois pour
 * toute l'app, retourne `loaded`/`error` et expose le namespace global
 * `google.maps`.
 *
 * Configuration :
 *   - Variable d'environnement : `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
 *     (publique car la clé est appelée côté navigateur).
 *   - Restreindre la clé dans Google Cloud Console aux domaines autorisés
 *     (HTTP referrers) — sans restriction la clé est exposée à toute la planète.
 *
 * Usage :
 *   const { loaded, error, hasApiKey } = useGoogleMapsScript();
 *   if (!hasApiKey) return <FallbackUI />;
 *   if (!loaded) return <Skeleton />;
 *   // window.google.maps.places.* est dispo
 */

import { useEffect, useState } from "react";

const SCRIPT_ID = "gmaps-js-api";

type LoaderState =
  | { status: "idle" | "loading" | "ready"; error?: undefined }
  | { status: "error"; error: string };

let globalState: LoaderState = { status: "idle" };
const subscribers = new Set<(state: LoaderState) => void>();

function setGlobalState(next: LoaderState) {
  globalState = next;
  for (const cb of subscribers) cb(next);
}

/**
 * Charge le script Google Maps avec les bibliothèques demandées.
 * Idempotent — appels multiples = un seul script chargé.
 */
function loadScript(apiKey: string, libraries: string[]) {
  if (typeof window === "undefined") return;
  if (globalState.status === "ready" || globalState.status === "loading") return;

  // Si window.google est déjà là (autre lib ou hot-reload), on est prêts.
  if ((window as any).google?.maps?.places) {
    setGlobalState({ status: "ready" });
    return;
  }

  setGlobalState({ status: "loading" });

  const params = new URLSearchParams({
    key: apiKey,
    libraries: libraries.join(","),
    loading: "async",
    v: "weekly",
  });
  const url = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    existing.addEventListener("load", () => setGlobalState({ status: "ready" }));
    existing.addEventListener("error", () =>
      setGlobalState({ status: "error", error: "Échec du chargement Google Maps" }),
    );
    return;
  }

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = url;
  script.async = true;
  script.defer = true;
  script.onload = () => setGlobalState({ status: "ready" });
  script.onerror = () =>
    setGlobalState({ status: "error", error: "Échec du chargement Google Maps" });
  document.head.appendChild(script);
}

interface UseGoogleMapsOptions {
  libraries?: string[];
}

interface UseGoogleMapsResult {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  hasApiKey: boolean;
}

export function useGoogleMapsScript(
  options: UseGoogleMapsOptions = {},
): UseGoogleMapsResult {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const libraries = options.libraries ?? ["places"];

  const [state, setState] = useState<LoaderState>(globalState);

  useEffect(() => {
    if (!apiKey) return;
    const cb = (next: LoaderState) => setState(next);
    subscribers.add(cb);
    loadScript(apiKey, libraries);
    return () => {
      subscribers.delete(cb);
    };
  }, [apiKey, libraries.join(",")]); // libraries est stable en pratique

  return {
    hasApiKey: Boolean(apiKey),
    loaded: state.status === "ready",
    loading: state.status === "loading",
    error: state.status === "error" ? state.error : null,
  };
}
