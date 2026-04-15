/**
 * Schedule Matching — Fonctions pures pour évaluer si un agent est dans sa
 * plage horaire courante selon son agentSchedule.
 *
 * Pas de dépendance externe : on utilise `Intl.DateTimeFormat` (disponible en
 * Convex V8 runtime) pour extraire le jour et l'heure locale dans la timezone
 * de l'organisation.
 *
 * Utilisé par le cron `match-agent-schedules-to-presence` (toutes les 5 min)
 * pour ajuster automatiquement la présence des agents selon leur planning.
 */

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface TimeRange {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export interface ScheduleDay {
  day: DayOfWeek;
  timeRanges: TimeRange[];
}

export interface ScheduleException {
  date: string; // "YYYY-MM-DD"
  available: boolean;
  timeRanges?: TimeRange[];
  reason?: string;
}

export interface ScheduleMatchResult {
  /** L'agent est-il dans sa plage horaire ? */
  inSchedule: boolean;
  /** Une exception est-elle active ce jour ? (jour férié, congé, horaire modifié) */
  exceptionActive: boolean;
  /** Raison de l'exception si `exceptionActive` */
  exceptionReason?: string;
  /** Day-of-week matché (informatif) */
  resolvedDay: DayOfWeek;
  /** Time string HH:MM courant dans la TZ */
  currentTimeHHMM: string;
  /** Date YYYY-MM-DD courante dans la TZ */
  currentDateISO: string;
}

const DAY_INDEX: Record<number, DayOfWeek> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

/**
 * Extrait { date "YYYY-MM-DD", time "HH:MM", dayOfWeek } dans la timezone donnée.
 *
 * Utilise `Intl.DateTimeFormat` avec l'option `timeZone`. Pas de dépendance.
 */
export function extractLocalDateTime(
  nowMs: number,
  timezone: string,
): { date: string; time: string; day: DayOfWeek } {
  const now = new Date(nowMs);

  // Date YYYY-MM-DD dans la TZ cible
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const date = dateFmt.format(now); // "YYYY-MM-DD" via en-CA

  // Heure HH:MM dans la TZ cible
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const time = timeFmt.format(now); // "HH:MM" via en-GB 24h

  // Jour de la semaine — on passe par un formatter qui retourne l'indice
  // via la locale "en-US" weekday long, puis on remappe.
  const weekdayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  });
  const weekdayName = weekdayFmt.format(now).toLowerCase() as DayOfWeek;

  return { date, time, day: weekdayName };
}

/**
 * Parse "HH:MM" vers minutes-depuis-minuit. Retourne -1 si format invalide.
 */
export function timeToMinutes(hhmm: string): number {
  const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return -1;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

/**
 * Vérifie si `currentHHMM` est contenu dans au moins une plage `timeRanges`.
 * Inclut start, exclut end (convention standard [start, end[).
 */
export function isInAnyRange(currentHHMM: string, ranges: TimeRange[]): boolean {
  const nowMinutes = timeToMinutes(currentHHMM);
  if (nowMinutes < 0) return false;
  for (const range of ranges) {
    const startMin = timeToMinutes(range.start);
    const endMin = timeToMinutes(range.end);
    if (startMin < 0 || endMin < 0) continue;
    if (nowMinutes >= startMin && nowMinutes < endMin) return true;
  }
  return false;
}

/**
 * Résolution complète : l'agent est-il dans sa plage horaire maintenant ?
 *
 * Ordre de priorité :
 *   1. Exception pour la date du jour (peut forcer fermé ou custom hours).
 *   2. Weekly schedule pour le jour de la semaine.
 *   3. Aucun match → hors plage.
 */
export function isCurrentTimeInSchedule(
  nowMs: number,
  timezone: string,
  weeklySchedule: ScheduleDay[],
  exceptions: ScheduleException[] | undefined,
): ScheduleMatchResult {
  const { date, time, day } = extractLocalDateTime(nowMs, timezone);

  // 1. Exception pour la date du jour
  const exception = exceptions?.find((e) => e.date === date);
  if (exception) {
    if (!exception.available) {
      return {
        inSchedule: false,
        exceptionActive: true,
        exceptionReason: exception.reason,
        resolvedDay: day,
        currentTimeHHMM: time,
        currentDateISO: date,
      };
    }
    // Horaires modifiés ce jour
    const ranges = exception.timeRanges ?? [];
    return {
      inSchedule: ranges.length > 0 && isInAnyRange(time, ranges),
      exceptionActive: true,
      exceptionReason: exception.reason,
      resolvedDay: day,
      currentTimeHHMM: time,
      currentDateISO: date,
    };
  }

  // 2. Weekly schedule par jour
  const dayEntry = weeklySchedule.find((d) => d.day === day);
  if (!dayEntry || dayEntry.timeRanges.length === 0) {
    return {
      inSchedule: false,
      exceptionActive: false,
      resolvedDay: day,
      currentTimeHHMM: time,
      currentDateISO: date,
    };
  }

  return {
    inSchedule: isInAnyRange(time, dayEntry.timeRanges),
    exceptionActive: false,
    resolvedDay: day,
    currentTimeHHMM: time,
    currentDateISO: date,
  };
}

// Unused but kept for API symmetry — pourrait servir à pré-calculer le
// prochain changement de statut pour optimiser les cron intervals.
export { DAY_INDEX };
