import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PNPE_URL =
  process.env.NEXT_PUBLIC_DOMAIN_PNPE ?? "emploi.administration.ga";
export const DEMARCHE_URL =
  process.env.NEXT_PUBLIC_DOMAIN_DEMARCHE ?? "demarche.ga";

export function pnpeLink(path = ""): string {
  const base = PNPE_URL.startsWith("http") ? PNPE_URL : `https://${PNPE_URL}`;
  return `${base}${path}`;
}

/**
 * Les références d'offres PNPE peuvent contenir des `/`
 * (ex: `OE/2026/DEMO/1004`). On encode pour qu'elles tiennent dans
 * un seul segment `[reference]` de Next.js — la page de détail
 * décode via `decodeURIComponent`.
 */
export function offreHref(reference: string): string {
  return `/offres/${encodeURIComponent(reference)}`;
}

export function postulerHref(reference: string): string {
  return `/postuler/${encodeURIComponent(reference)}`;
}
