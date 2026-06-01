"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, RotateCcw, Save, Mic, PenTool, BookOpen, Headphones, Layers, Building2, CalendarDays, Users } from "lucide-react";

interface PricingRow {
  key: string;
  label: string;
  amount: number;
  amountRupees: string;
  maxStudents: number | null;
  isCustom: boolean;
}

const PLAN_META: Record<string, { icon: any; color: string; bg: string; group: string }> = {
  // Student — 1 month
  MODULE_SPEAKING:    { icon: Mic,          color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/30",      group: "Student Plans (1 Month)" },
  MODULE_WRITING:     { icon: PenTool,      color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/30",      group: "Student Plans (1 Month)" },
  MODULE_READING:     { icon: BookOpen,     color: "text-purple-600",  bg: "bg-purple-50 dark:bg-purple-950/30",  group: "Student Plans (1 Month)" },
  MODULE_LISTENING:   { icon: Headphones,   color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950/30",  group: "Student Plans (1 Month)" },
  ALL_MODULES:        { icon: Layers,       color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-950/30",  group: "Student Plans (1 Month)" },
  // Student — 6 months
  MODULE_SPEAKING_6M: { icon: Mic,          color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/30",      group: "Student Plans (6 Months)" },
  MODULE_WRITING_6M:  { icon: PenTool,      color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/30",      group: "Student Plans (6 Months)" },
  MODULE_READING_6M:  { icon: BookOpen,     color: "text-purple-600",  bg: "bg-purple-50 dark:bg-purple-950/30",  group: "Student Plans (6 Months)" },
  MODULE_LISTENING_6M:{ icon: Headphones,   color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950/30",  group: "Student Plans (6 Months)" },
  ALL_MODULES_6M:     { icon: Layers,       color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-950/30",  group: "Student Plans (6 Months)" },
  // Student — 1 year
  MODULE_SPEAKING_1Y: { icon: Mic,          color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/30",      group: "Student Plans (1 Year)" },
  MODULE_WRITING_1Y:  { icon: PenTool,      color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/30",      group: "Student Plans (1 Year)" },
  MODULE_READING_1Y:  { icon: BookOpen,     color: "text-purple-600",  bg: "bg-purple-50 dark:bg-purple-950/30",  group: "Student Plans (1 Year)" },
  MODULE_LISTENING_1Y:{ icon: Headphones,   color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950/30",  group: "Student Plans (1 Year)" },
  ALL_MODULES_1Y:     { icon: Layers,       color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-950/30",  group: "Student Plans (1 Year)" },
  // Centre — monthly
  CENTRE_MINI:        { icon: Building2,    color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/30",      group: "Centre Plans (Monthly)" },
  CENTRE_SMALL:       { icon: Building2,    color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-950/30",  group: "Centre Plans (Monthly)" },
  // Centre — 6 months
  CENTRE_STARTER:     { icon: Building2,    color: "text-green-600",   bg: "bg-green-50 dark:bg-green-950/30",    group: "Centre Plans (6 Months)" },
  CENTRE_GROWTH:      { icon: Building2,    color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30",group: "Centre Plans (6 Months)" },
  CENTRE_PRO:         { icon: Building2,    color: "text-cyan-600",    bg: "bg-cyan-50 dark:bg-cyan-950/30",      group: "Centre Plans (6 Months)" },
  // Annual institute plans
  ANNUAL_STARTER:     { icon: CalendarDays, color: "text-green-600",   bg: "bg-green-50 dark:bg-green-950/30",    group: "Annual Institute Plans" },
  ANNUAL_GROWTH:      { icon: CalendarDays, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30",group: "Annual Institute Plans" },
  ANNUAL_UNLIMITED:   { icon: CalendarDays, color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30",    group: "Annual Institute Plans" },
};

const DEFAULT_RUPEES: Record<string, string> = {
  MODULE_SPEAKING: "199",    MODULE_WRITING: "199",    MODULE_READING: "199",    MODULE_LISTENING: "199",    ALL_MODULES: "599",
  MODULE_SPEAKING_6M: "999", MODULE_WRITING_6M: "999", MODULE_READING_6M: "999", MODULE_LISTENING_6M: "999", ALL_MODULES_6M: "2999",
  MODULE_SPEAKING_1Y: "1799",MODULE_WRITING_1Y: "1799",MODULE_READING_1Y: "1799",MODULE_LISTENING_1Y: "1799",ALL_MODULES_1Y: "4999",
  CENTRE_MINI: "1199", CENTRE_SMALL: "2999",
  CENTRE_STARTER: "2999", CENTRE_GROWTH: "6999", CENTRE_PRO: "14999",
  ANNUAL_STARTER: "11999", ANNUAL_GROWTH: "29999", ANNUAL_UNLIMITED: "79999",
};

const DEFAULT_MAX_STUDENTS: Record<string, number> = {
  CENTRE_MINI: 5, CENTRE_SMALL: 20,
  CENTRE_STARTER: 50, CENTRE_GROWTH: 150, CENTRE_PRO: 500,
  ANNUAL_STARTER: 65, ANNUAL_GROWTH: 180, ANNUAL_UNLIMITED: -1,
};

export default function SuperAdminPricingPage() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [studentsEdits, setStudentsEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPrices = async () => {
    setLoading(true);
    const res = await fetch("/api/super-admin/pricing");
    const data = await res.json();
    if (data.success) {
      setRows(data.data);
      const initialPrices: Record<string, string> = {};
      const initialStudents: Record<string, string> = {};
      for (const r of data.data) {
        initialPrices[r.key] = r.amountRupees;
        if (r.maxStudents !== null) {
          initialStudents[r.key] = String(r.maxStudents);
        }
      }
      setPriceEdits(initialPrices);
      setStudentsEdits(initialStudents);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPrices(); }, []);

  const handleSave = async (key: string, hasMaxStudents: boolean) => {
    const val = priceEdits[key];
    if (!val || isNaN(Number(val))) return;
    setSaving(key);
    const body: Record<string, unknown> = { key, amountRupees: val };
    if (hasMaxStudents) {
      const s = studentsEdits[key];
      if (s !== undefined && s !== "" && !isNaN(Number(s))) {
        body.maxStudents = Number(s);
      }
    }
    const res = await fetch("/api/super-admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      setRows(prev => prev.map(r => r.key === key
        ? { ...r, amount: data.data.amount, amountRupees: data.data.amountRupees, maxStudents: data.data.maxStudents ?? r.maxStudents, isCustom: true }
        : r
      ));
      showToast("Plan updated successfully");
    } else {
      showToast(data.error || "Failed to update plan");
    }
    setSaving(null);
  };

  const handleReset = async (key: string) => {
    setResetting(key);
    await fetch(`/api/super-admin/pricing?key=${key}`, { method: "DELETE" });
    const defaultRupees = DEFAULT_RUPEES[key] ?? "";
    const defaultMax = DEFAULT_MAX_STUDENTS[key];
    setRows(prev => prev.map(r => r.key === key
      ? { ...r, isCustom: false, amountRupees: defaultRupees, maxStudents: defaultMax ?? r.maxStudents }
      : r
    ));
    setPriceEdits(prev => ({ ...prev, [key]: defaultRupees }));
    if (defaultMax !== undefined) {
      setStudentsEdits(prev => ({ ...prev, [key]: String(defaultMax) }));
    }
    showToast("Reset to default values");
    setResetting(null);
  };

  const groups = [
    "Student Plans (1 Month)",
    "Student Plans (6 Months)",
    "Student Plans (1 Year)",
    "Centre Plans (Monthly)",
    "Centre Plans (6 Months)",
    "Annual Institute Plans",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Pricing Management</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Set prices and student limits for all subscription plans. Changes take effect immediately for new purchases.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-700">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : (
        groups.map(group => {
          const groupRows = rows.filter(r => PLAN_META[r.key]?.group === group);
          return (
            <div key={group}>
              <h2 className="mb-3 text-base font-semibold text-gray-700 dark:text-slate-300">{group}</h2>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {groupRows.map(row => {
                      const meta = PLAN_META[row.key];
                      const Icon = meta?.icon ?? IndianRupee;
                      const hasMaxStudents = row.maxStudents !== null;
                      const currentMax = row.maxStudents === -1 ? "∞" : String(row.maxStudents ?? "");
                      const isPriceDirty = priceEdits[row.key] !== row.amountRupees;
                      const isStudentsDirty = hasMaxStudents && studentsEdits[row.key] !== String(row.maxStudents);
                      const isDirty = isPriceDirty || isStudentsDirty;

                      return (
                        <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta?.bg}`}>
                              <Icon className={`h-5 w-5 ${meta?.color}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-slate-100 truncate">{row.label}</p>
                                {row.isCustom && (
                                  <Badge variant="secondary" className="text-xs shrink-0">Custom</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 dark:text-slate-500">
                                ₹{row.amountRupees}
                                {hasMaxStudents && (
                                  <> · {currentMax === "∞" ? "Unlimited" : `${currentMax} students`}</>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {/* Price input */}
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                              <Input
                                type="number"
                                min="0"
                                value={priceEdits[row.key] ?? row.amountRupees}
                                onChange={e => setPriceEdits(prev => ({ ...prev, [row.key]: e.target.value }))}
                                className="w-32 pl-7"
                                placeholder="Price"
                              />
                            </div>

                            {/* Students input — only for centre/annual plans */}
                            {hasMaxStudents && (
                              <div className="relative">
                                <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <Input
                                  type="number"
                                  min="-1"
                                  value={studentsEdits[row.key] ?? String(row.maxStudents)}
                                  onChange={e => setStudentsEdits(prev => ({ ...prev, [row.key]: e.target.value }))}
                                  className="w-24 pl-7"
                                  placeholder="Students"
                                  title="-1 for unlimited"
                                />
                              </div>
                            )}

                            <Button
                              size="sm"
                              onClick={() => handleSave(row.key, hasMaxStudents)}
                              loading={saving === row.key}
                              disabled={!isDirty && !saving}
                              className="gap-1.5"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Save
                            </Button>
                            {row.isCustom && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReset(row.key)}
                                loading={resetting === row.key}
                                className="gap-1.5 text-gray-400"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })
      )}

      <p className="text-xs text-gray-400 dark:text-slate-500">
        All prices are in Indian Rupees (INR). Set students to -1 for unlimited. Changes apply to new purchases only.
      </p>
    </div>
  );
}
