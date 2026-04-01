import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getLocalizedValue } from "@workspace/shared/utils/i18n"
import i18n from "@workspace/i18n/config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Shorthand: extract localized text from a string or {en, fr} object using current i18n language */
export const localizedText = (value: string | Record<string, string> | undefined | null) =>
  getLocalizedValue(value, i18n.language) || "—"
