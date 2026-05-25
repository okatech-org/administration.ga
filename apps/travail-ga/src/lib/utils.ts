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
