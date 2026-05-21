/**
 * Petit utilitaire d'export CSV côté client pour les tabs Catalog et
 * Recherche. Pas de dépendance externe — RFC 4180 minimal (quote-double
 * uniquement quand nécessaire, BOM UTF-8 pour ouverture propre dans
 * Excel/Numbers en français).
 */

function escapeCell(value: unknown): string {
	if (value === null || value === undefined) return "";
	const s = String(value);
	if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

export function downloadCsv(
	filename: string,
	headers: string[],
	rows: unknown[][],
) {
	const lines = [headers.map(escapeCell).join(",")];
	for (const row of rows) lines.push(row.map(escapeCell).join(","));
	// BOM UTF-8 (﻿) pour Excel.
	const csv = `﻿${lines.join("\n")}`;
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	const stamp = new Date().toISOString().slice(0, 10);
	a.download = filename.endsWith(".csv")
		? filename.replace(/\.csv$/, `-${stamp}.csv`)
		: `${filename}-${stamp}.csv`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
