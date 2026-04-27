/**
 * Date grouping helpers for call history sections.
 *
 * Buckets calls by relative date — "Aujourd'hui", "Hier", "Cette semaine",
 * "Plus tôt" — so the agent can scan large lists faster instead of staring
 * at "il y a X minutes" labels stacked indefinitely.
 */

export type DateBucketKey = "today" | "yesterday" | "this_week" | "earlier";

export interface DateBucket<T> {
	key: DateBucketKey;
	rows: T[];
}

const MS_DAY = 24 * 60 * 60 * 1000;

function startOfDay(ts: number): number {
	const d = new Date(ts);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

export function bucketKey(ts: number, now: number = Date.now()): DateBucketKey {
	const todayStart = startOfDay(now);
	if (ts >= todayStart) return "today";
	if (ts >= todayStart - MS_DAY) return "yesterday";
	if (ts >= todayStart - 6 * MS_DAY) return "this_week";
	return "earlier";
}

/**
 * Group rows by date bucket, preserving the order of rows within each bucket.
 * Returns only buckets that contain at least one row, in chronological order.
 */
export function groupByDate<T>(
	rows: T[],
	getTimestamp: (row: T) => number,
): Array<DateBucket<T>> {
	const now = Date.now();
	const buckets: Record<DateBucketKey, T[]> = {
		today: [],
		yesterday: [],
		this_week: [],
		earlier: [],
	};
	for (const row of rows) {
		buckets[bucketKey(getTimestamp(row), now)].push(row);
	}
	const order: DateBucketKey[] = ["today", "yesterday", "this_week", "earlier"];
	return order
		.filter((k) => buckets[k].length > 0)
		.map((k) => ({ key: k, rows: buckets[k] }));
}

/**
 * Translation key for a bucket, to be passed through `t(...)`.
 * Keys live under `callCenter.drawer.history.bucket.*` (where the existing
 * `callCenter.drawer.history.*` block sits in the i18n bundles).
 */
export function bucketLabelKey(k: DateBucketKey): string {
	return `callCenter.drawer.history.bucket.${k}`;
}
