"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, Upload, Download, AlertTriangle, FileText, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCSV, escapeCSV } from "@/lib/csv";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedWord {
  word: string;
  meaning: string;
  meaningHi: string | null;
  meaningPa: string | null;
  example: string;
  category: string | null;
  difficulty: string;
  dayNumber: number | null;
}

interface RowResult {
  rowNum: number;
  rawWord: string;
  errors: string[];
  vocab: ParsedWord | null;
}

const HEADERS = ["word", "meaning", "meaning_hi", "meaning_pa", "example", "category", "difficulty", "day_number"];
const EXAMPLE = [
  "Ubiquitous", "Present, appearing, or found everywhere", "हर जगह मौजूद", "",
  "Mobile phones have become ubiquitous in modern society.", "academic", "MEDIUM", "",
];
const NOTES = [
  "word, meaning, example — required",
  "meaning_hi, meaning_pa — optional, leave blank if unknown",
  "category — free text, e.g. academic, everyday, topic-specific",
  "difficulty — EASY / MEDIUM / HARD (default: MEDIUM)",
  "day_number — optional, for the Word of the Day rotation",
  "A word already in the vocabulary list (case-insensitive) is skipped, not duplicated",
];

// ─── CSV helpers ────────────────────────────────────────────────────────────────

function generateTemplate(): string {
  return [HEADERS.join(","), EXAMPLE.map(escapeCSV).join(",")].join("\n");
}

function downloadTemplate() {
  const blob = new Blob(["﻿" + generateTemplate()], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template_vocabulary.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function validateRows(csvText: string): RowResult[] {
  const rows = parseCSV(csvText);
  const seen = new Set<string>();

  return rows.map((row, i) => {
    const rowNum = i + 1;
    const errors: string[] = [];
    const word = (row.word || "").trim();
    const meaning = (row.meaning || "").trim();
    const example = (row.example || "").trim();

    if (!word) errors.push('"word" is required');
    if (!meaning) errors.push('"meaning" is required');
    if (!example) errors.push('"example" is required');

    const key = word.toLowerCase();
    if (word) {
      if (seen.has(key)) errors.push(`Duplicate of another row in this file ("${word}")`);
      seen.add(key);
    }

    const rawDiff = (row.difficulty || "").trim().toUpperCase();
    const difficulty = ["EASY", "MEDIUM", "HARD"].includes(rawDiff) ? rawDiff : "MEDIUM";

    const dayNumberRaw = (row.day_number || "").trim();
    let dayNumber: number | null = null;
    if (dayNumberRaw) {
      dayNumber = Number(dayNumberRaw);
      if (!Number.isFinite(dayNumber)) errors.push('"day_number" must be a number');
    }

    const vocab: ParsedWord | null =
      errors.length === 0
        ? {
            word,
            meaning,
            meaningHi: (row.meaning_hi || "").trim() || null,
            meaningPa: (row.meaning_pa || "").trim() || null,
            example,
            category: (row.category || "").trim() || null,
            difficulty,
            dayNumber,
          }
        : null;

    return { rowNum, rawWord: word || `(row ${rowNum})`, errors, vocab };
  });
}

// ─── Component ──────────────────────────────────────────────────────────────────

interface VocabularyBulkUploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

export function VocabularyBulkUploadModal({ onClose, onUploaded }: VocabularyBulkUploadModalProps) {
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [showNotes, setShowNotes] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rowResults, setRowResults] = useState<RowResult[]>([]);
  const [filter, setFilter] = useState<"all" | "valid" | "invalid">("all");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ count: number; skipped?: number; error?: string } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = rowResults.filter((r) => r.vocab !== null);
  const invalidRows = rowResults.filter((r) => r.vocab === null);
  const displayRows = filter === "valid" ? validRows : filter === "invalid" ? invalidRows : rowResults;

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a .csv file. Export your spreadsheet as CSV first.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text.trim()) { alert("The file is empty."); return; }
      const results = validateRows(text);
      if (results.length === 0) {
        alert("No data rows found. Make sure the file has a header row and at least one data row.");
        return;
      }
      setRowResults(results);
      setFilter("all");
      setExpandedRows(new Set());
      setStep("review");
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUpload = async () => {
    const toUpload = validRows.map((r) => r.vocab).filter(Boolean);
    if (toUpload.length === 0) return;
    setUploading(true);
    try {
      const res = await fetch("/api/vocabulary/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: toUpload }),
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult({ count: data.data.created, skipped: data.data.skippedExisting });
        setStep("done");
        onUploaded();
      } else {
        setUploadResult({ count: 0, error: data.error || "Upload failed" });
        setStep("done");
      }
    } catch {
      setUploadResult({ count: 0, error: "Network error. Please try again." });
      setStep("done");
    } finally {
      setUploading(false);
    }
  };

  const toggleRow = (rowNum: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum);
      else next.add(rowNum);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Bulk Import Vocabulary</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {step === "upload" && "Upload a CSV file"}
              {step === "review" && `Review & upload (${validRows.length} valid, ${invalidRows.length} invalid)`}
              {step === "done" && "Complete"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === "upload" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/30">
                <button onClick={() => setShowNotes((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <span className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                    <FileText className="h-4 w-4" /> Format Guide
                  </span>
                  <span className="text-xs text-indigo-400">{showNotes ? "▲" : "▼"}</span>
                </button>
                {showNotes && (
                  <div className="border-t border-indigo-100 px-4 pb-4 pt-3 dark:border-indigo-900">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">CSV Columns</p>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {HEADERS.map((h) => (
                        <code key={h} className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-mono text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">{h}</code>
                      ))}
                    </div>
                    <ul className="space-y-1">
                      {NOTES.map((note, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-slate-400">{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
                  isDragging
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30"
                    : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50 dark:border-slate-600 dark:hover:border-indigo-600 dark:hover:bg-slate-800/60"
                )}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-gray-300 dark:text-slate-500" />
                <div>
                  <p className="font-medium text-gray-700 dark:text-slate-300">Drop your CSV file here, or click to browse</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Export from Excel or Google Sheets as .csv</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                  {rowResults.length} rows parsed
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> {validRows.length} valid
                </span>
                {invalidRows.length > 0 && (
                  <span className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    <XCircle className="h-4 w-4" /> {invalidRows.length} invalid
                  </span>
                )}
                <button onClick={() => { setRowResults([]); setStep("upload"); }} className="ml-auto text-sm text-indigo-600 underline dark:text-indigo-400">
                  Upload different file
                </button>
              </div>

              <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-700">
                {(["all", "valid", "invalid"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition",
                      filter === f ? "bg-white text-gray-900 shadow-sm dark:bg-slate-600 dark:text-slate-100" : "text-gray-500 dark:text-slate-400"
                    )}
                  >
                    {f} {f === "all" ? `(${rowResults.length})` : f === "valid" ? `(${validRows.length})` : `(${invalidRows.length})`}
                  </button>
                ))}
              </div>

              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-slate-700 dark:border-slate-700">
                {displayRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">No rows to show</p>
                ) : (
                  displayRows.map((r) => {
                    const isExpanded = expandedRows.has(r.rowNum);
                    const isValid = r.vocab !== null;
                    return (
                      <div key={r.rowNum}>
                        <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/60" onClick={() => !isValid && toggleRow(r.rowNum)}>
                          {isValid ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> : <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                          <span className="shrink-0 text-xs font-mono text-gray-400 dark:text-slate-500">Row {r.rowNum}</span>
                          <span className="flex-1 truncate text-sm text-gray-700 dark:text-slate-300">{r.rawWord}</span>
                          {!isValid && (
                            <span className="shrink-0 text-xs text-red-500">
                              {r.errors.length} error{r.errors.length !== 1 ? "s" : ""}{isExpanded ? " ▲" : " ▼"}
                            </span>
                          )}
                        </button>
                        {!isValid && isExpanded && (
                          <ul className="border-t border-red-100 bg-red-50/60 px-4 pb-3 pt-2 dark:border-red-900/40 dark:bg-red-950/20">
                            {r.errors.map((e, i) => (
                              <li key={i} className="flex items-start gap-2 py-0.5 text-xs text-red-700 dark:text-red-400">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {e}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {invalidRows.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                  <strong>{invalidRows.length}</strong> invalid row{invalidRows.length !== 1 ? "s" : ""} will be skipped.
                  Click errors above to see what needs fixing, then re-upload the corrected file.
                </div>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {uploadResult?.error ? (
                <>
                  <XCircle className="h-14 w-14 text-red-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Upload Failed</h3>
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadResult.error}</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-14 w-14 text-green-500" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {uploadResult?.count} word{uploadResult?.count !== 1 ? "s" : ""} added
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                    {uploadResult?.skipped ? `${uploadResult.skipped} skipped — already in the vocabulary list. ` : ""}
                    New words are now available in the Vocabulary Builder.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4 dark:border-slate-700">
          {step === "upload" && (
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
                <Download className="h-4 w-4" /> Download Template
              </Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          )}

          {step === "review" && (
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => { setRowResults([]); setStep("upload"); }}>← Back</Button>
              <Button onClick={handleUpload} disabled={validRows.length === 0 || uploading} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Uploading…
                  </span>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Upload {validRows.length} Valid Word{validRows.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="flex justify-end gap-3">
              {!uploadResult?.error && (
                <Button variant="outline" onClick={() => { setStep("upload"); setRowResults([]); setUploadResult(null); setShowNotes(false); }}>
                  Upload More
                </Button>
              )}
              <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white">Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
