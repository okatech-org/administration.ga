/**
 * CSV import utility for batch card printing.
 * Uses papaparse for robust CSV parsing (handles quoted fields, embedded commas, etc.)
 */

import Papa from "papaparse"

export interface CSVData {
  headers: string[]
  rows: Record<string, string>[]
  rowCount: number
}

export function parseCSV(text: string): CSVData {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    rowCount: result.data.length,
  }
}
