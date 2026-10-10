// Minimal CSV parsing/escaping shared by the admin bulk-upload modals
// (Questions and Vocabulary). Handles quoted fields with embedded commas,
// escaped quotes, and a UTF-8 BOM.

export function parseCSV(text: string): Record<string, string>[] {
  // Strip UTF-8 BOM if present
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (nonEmpty.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === "," && !inQ) {
        result.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  };

  const headers = parseRow(nonEmpty[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const vals = parseRow(nonEmpty[i]);
    // Skip rows where all values are empty
    if (vals.every((v) => !v.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = vals[j] ?? ""; });
    rows.push(row);
  }
  return rows;
}

export function escapeCSV(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("|") || v.includes("::")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
