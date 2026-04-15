/**
 * Icon resolver — mappe les noms d'icônes (strings, stockés dans les presets)
 * vers leurs composants Lucide React correspondants.
 *
 * Pourquoi des strings ? Les presets sont des objets sérialisables (utiles pour
 * config backoffice, audit log, etc.). Stocker un composant React bloque la
 * sérialisation et crée une dépendance circulaire.
 *
 * DS v3 §6 : icônes Lucide exclusivement.
 */

import {
	Bot,
	Contact,
	Headphones,
	Inbox,
	MessageSquare,
	Mic,
	Phone,
	Settings,
	Video,
	Voicemail,
	type LucideIcon,
} from "lucide-react";

/** Icônes disponibles pour les presets iAsted. */
const ICON_REGISTRY: Record<string, LucideIcon> = {
	Bot,
	Contact,
	Headphones,
	Inbox,
	MessageSquare,
	Mic,
	Phone,
	Settings,
	Video,
	Voicemail,
};

/**
 * Résout un nom d'icône vers son composant Lucide.
 * Fallback : Bot (si icon inconnue, on ne plante pas).
 */
export function resolveIcon(name: string): LucideIcon {
	return ICON_REGISTRY[name] ?? Bot;
}

/** Enregistre une icône custom (utile pour consumers qui étendent le registry). */
export function registerIcon(name: string, icon: LucideIcon): void {
	ICON_REGISTRY[name] = icon;
}

/** Liste des icônes disponibles (pour docs / Storybook). */
export function listIcons(): string[] {
	return Object.keys(ICON_REGISTRY);
}
