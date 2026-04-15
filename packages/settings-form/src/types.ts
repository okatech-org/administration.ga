/**
 * Types partagés du package settings-form.
 */

/** Statut de sauvegarde d'une section ou agrégat global. */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Une entrée du registre de flushes — chaque section s'y inscrit. */
export interface FlushEntry {
  /** Identifiant unique de la section (ex: "identity", "protocol") */
  id: string;
  /** Force un save immédiat de la valeur pending */
  flush: () => Promise<void>;
  /** Retourne true si la section a des modifications non sauvegardées */
  isDirty: () => boolean;
}

/** Props communes à toutes les sections du formulaire paramétrage. */
export interface SettingsSectionBaseProps {
  onStatusChange?: (status: SaveStatus, errorMessage?: string) => void;
}
