"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/layout/AuthProvider";
import { ShareModal } from "@/components/workspace/ShareModal";
import {
  ArrowLeft, Plus, Trash2, MoreVertical, Share2, Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, FileSpreadsheet, Download, History,
  Sparkles, Filter, Sigma, Type, X, Search, ChevronDown, Check,
  Strikethrough, Underline, WrapText, Palette, BarChart2, Grid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";

dayjs.extend(relativeTime);

interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
}

interface SheetData {
  name: string;
  data: string[][];
  styles?: Record<string, CellStyle>; // key: "row-col"
  colWidths: number[];
}

interface SpreadsheetDoc {
  id: string;
  title: string;
  icon: string;
  sheets: SheetData[];
  is_pinned: boolean;
  last_edited_at: string;
  owner_id?: string;
}

const COLS = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];

function ensureSize(data: string[][], rows: number, cols: number): string[][] {
  const out: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row = data[r] || [];
    const newRow: string[] = [];
    for (let c = 0; c < cols; c++) newRow.push(row[c] ?? "");
    out.push(newRow);
  }
  return out;
}

function evaluateFormula(formula: string, data: string[][]): string {
  if (!formula.startsWith("=")) return formula;
  try {
    const expr = formula.slice(1).toUpperCase();

    // 1. SUM / AVERAGE / MIN / MAX / PRODUCT with multiple arguments/ranges
    // e.g. =SUM(A1:B3, C5, 10)
    const aggMatch = expr.match(/^(SUM|AVERAGE|MIN|MAX|PRODUCT|COUNT)\((.*)\)$/);
    if (aggMatch) {
      const func = aggMatch[1];
      const argsStr = aggMatch[2];
      const vals: number[] = [];
      
      const args = argsStr.split(",").map(a => a.trim());
      args.forEach(arg => {
        if (arg.includes(":")) {
          const [start, end] = arg.split(":");
          getCellRange(start, end, data).forEach(v => vals.push(parseFloat(v) || 0));
        } else if (arg.match(/^[A-Z]+\d+$/)) {
          const col = COLS.indexOf(arg.replace(/\d+/, ""));
          const row = parseInt(arg.replace(/[A-Z]+/, "")) - 1;
          vals.push(parseFloat(data[row]?.[col]) || 0);
        } else {
          vals.push(parseFloat(arg) || 0);
        }
      });

      if (func === "SUM") return String(vals.reduce((a, b) => a + b, 0));
      if (func === "PRODUCT") return String(vals.reduce((a, b) => a * b, 1));
      if (func === "AVERAGE") return vals.length ? String(vals.reduce((a, b) => a + b, 0) / vals.length) : "0";
      if (func === "COUNT") return String(vals.filter(v => !isNaN(v)).length);
      if (func === "MIN") return String(Math.min(...vals));
      if (func === "MAX") return String(Math.max(...vals));
    }

    // 2. IF(condition, true_val, false_val)
    const ifMatch = expr.match(/^IF\((.*),(.*),(.*)\)$/);
    if (ifMatch) {
      const cond = ifMatch[1].trim();
      const trueVal = ifMatch[2].trim();
      const falseVal = ifMatch[3].trim();
      
      // Simple condition evaluation
      const res = evaluateArithmetic(cond.replace(/([A-Z]+\d+)/g, (match) => {
        const col = COLS.indexOf(match.replace(/\d+/, ""));
        const row = parseInt(match.replace(/[A-Z]+/, "")) - 1;
        const v = data[row]?.[col] || "0";
        return isNaN(parseFloat(v)) ? `"${v}"` : v;
      }));
      
      return res ? trueVal.replace(/^"|"$/g, "") : falseVal.replace(/^"|"$/g, "");
    }

    // 3. CONCATENATE(a, b, ...)
    const concatMatch = expr.match(/^CONCATENATE\((.*)\)$/);
    if (concatMatch) {
      return concatMatch[1].split(",").map(a => {
        const arg = a.trim();
        if (arg.match(/^[A-Z]+\d+$/)) {
          const col = COLS.indexOf(arg.replace(/\d+/, ""));
          const row = parseInt(arg.replace(/[A-Z]+/, "")) - 1;
          return data[row]?.[col] || "";
        }
        return arg.replace(/^"|"$/g, "");
      }).join("");
    }

    // 4. Cell reference e.g. =A1
    const refMatch = expr.match(/^([A-Z]+)(\d+)$/);
    if (refMatch) {
      const col = COLS.indexOf(refMatch[1]);
      const row = parseInt(refMatch[2]) - 1;
      if (col >= 0 && row >= 0 && data[row]) return data[row][col] ?? "";
    }

    // 5. Arithmetic expression
    return String(evaluateArithmetic(expr));
  } catch {
    return "#ERR";
  }
}

function evaluateArithmetic(expr: string): any {
  const safe = expr.replace(/[^0-9+\-*/(). <>!=&|]/g, "");
  // eslint-disable-next-line no-eval
  return Function(`"use strict"; return (${safe})`)();
}

function getCellRange(start: string, end: string, data: string[][]): string[] {
  const startCol = COLS.indexOf(start.replace(/\d+/, ""));
  const startRow = parseInt(start.replace(/[A-Z]+/, "")) - 1;
  const endCol = COLS.indexOf(end.replace(/\d+/, ""));
  const endRow = parseInt(end.replace(/[A-Z]+/, "")) - 1;
  const vals: string[] = [];
  for (let r = startRow; r <= endRow; r++)
    for (let c = startCol; c <= endCol; c++)
      if (data[r]) vals.push(data[r][c] ?? "");
  return vals;
}

export default function SpreadsheetEditorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [doc, setDoc] = useState<SpreadsheetDoc | null>(null);
  const [title, setTitle] = useState("Untitled Spreadsheet");
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [editCell, setEditCell] = useState<[number, number] | null>(null);
  const [formulaBar, setFormulaBar] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(false);

  // Share
  const [showShare, setShowShare] = useState(false);

  // AI
  const [showAI, setShowAI] = useState(false);
  const [aiAction, setAiAction] = useState("analyze_data");
  const [aiCustom, setAiCustom] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Find & Replace
  const [showFR, setShowFR] = useState(false);
  const [findTerm, setFindTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matches, setMatches] = useState<[number, number][]>([]);
  const [matchIdx, setMatchIdx] = useState(0);

  // Charts
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "area">("bar");
  const [chartData, setChartData] = useState<any[]>([]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ROWS = 50;
  const DISPLAY_COLS = 20;

  useEffect(() => { if (id && user?.id) fetchDoc(); }, [id, user?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't interfere if editing a cell or searching
      if (editCell || showFR || showAI) {
        if (e.key === "Escape") { setShowAI(false); setShowFR(false); setShowShare(false); }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); setShowFR(true); }
      if (e.key === "Escape") { setShowAI(false); setShowFR(false); setShowShare(false); }

      if (selectedCell) {
        const [r, c] = selectedCell;
        
        // Navigation
        if (e.key === "ArrowUp") { e.preventDefault(); if (r > 0) setSelectedCell([r - 1, c]); }
        if (e.key === "ArrowDown") { e.preventDefault(); if (r < ROWS - 1) setSelectedCell([r + 1, c]); }
        if (e.key === "ArrowLeft") { e.preventDefault(); if (c > 0) setSelectedCell([r, c - 1]); }
        if (e.key === "ArrowRight") { e.preventDefault(); if (c < DISPLAY_COLS - 1) setSelectedCell([r, c + 1]); }
        
        // Actions
        if (e.key === "Enter") { e.preventDefault(); setEditCell([r, c]); }
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          updateCell(r, c, "");
        }

        // Start typing to edit
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setEditCell([r, c]);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedCell, editCell, showFR, showAI, ROWS, DISPLAY_COLS]);

  async function fetchDoc() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/workspace/spreadsheets/${id}?userId=${user.id}`);
      const d = res.data.spreadsheet;
      setDoc(d);
      setTitle(d.title);
      const normalized = (d.sheets || []).map((s: SheetData) => ({
        ...s,
        data: ensureSize(s.data || [], ROWS, DISPLAY_COLS),
        styles: s.styles || {},
        colWidths: s.colWidths?.length ? s.colWidths : Array(DISPLAY_COLS).fill(150),
      }));
      setSheets(normalized.length ? normalized : [{ name: "Sheet 1", data: ensureSize([], ROWS, DISPLAY_COLS), styles: {}, colWidths: Array(DISPLAY_COLS).fill(150) }]);
    } catch { 
      router.push("/admin/workspace/spreadsheets"); 
    }
    finally { setLoading(false); }
  }

  function scheduleSave(updatedSheets: SheetData[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSheets(updatedSheets), 1500);
  }

  async function saveSheets(updatedSheets: SheetData[]) {
    if (!user?.id) return;
    setSaving(true);
    try {
      await axios.patch(`/api/workspace/spreadsheets/${id}?userId=${user.id}`, { sheets: updatedSheets, last_edited_by: user.id });
      setSavedAt(new Date());
    } catch {} finally { setSaving(false); }
  }

  function saveTitle(val: string) {
    setTitle(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!user?.id) return;
      await axios.patch(`/api/workspace/spreadsheets/${id}?userId=${user.id}`, { title: val });
    }, 1000);
  }

  function updateCellStyle(row: number, col: number, style: Partial<CellStyle>) {
    const newSheets = sheets.map((s, si) => {
      if (si !== activeSheet) return s;
      const key = `${row}-${col}`;
      const styles = { ...s.styles };
      styles[key] = { ...(styles[key] || {}), ...style };
      return { ...s, styles };
    });
    setSheets(newSheets);
    scheduleSave(newSheets);
  }

  function updateCell(row: number, col: number, value: string) {
    const newSheets = sheets.map((s, si) => {
      if (si !== activeSheet) return s;
      const data = s.data.map((r, ri) =>
        ri === row ? r.map((c2, ci) => (ci === col ? value : c2)) : [...r]
      );
      return { ...s, data };
    });
    setSheets(newSheets);
    scheduleSave(newSheets);
  }

  function addRow() {
    const newSheets = sheets.map((s, si) => {
      if (si !== activeSheet) return s;
      return { ...s, data: [...s.data, Array(DISPLAY_COLS).fill("")] };
    });
    setSheets(newSheets);
    scheduleSave(newSheets);
  }

  function addCol() {
    const newSheets = sheets.map((s, si) => {
      if (si !== activeSheet) return s;
      return {
        ...s,
        data: s.data.map((r) => [...r, ""]),
        colWidths: [...s.colWidths, 150],
      };
    });
    setSheets(newSheets);
    scheduleSave(newSheets);
  }

  function addSheet() {
    const newSheet: SheetData = {
      name: `Sheet ${sheets.length + 1}`,
      data: ensureSize([], ROWS, DISPLAY_COLS),
      colWidths: Array(DISPLAY_COLS).fill(150),
    };
    const newSheets = [...sheets, newSheet];
    setSheets(newSheets);
    setActiveSheet(newSheets.length - 1);
    scheduleSave(newSheets);
  }

  function exportCSV() {
    const sheet = sheets[activeSheet];
    if (!sheet) return;
    const csv = sheet.data
      .filter((row) => row.some((c) => c !== ""))
      .map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runAI() {
    const sheet = sheets[activeSheet];
    const dataStr = sheet.data
      .filter((r) => r.some((c) => c !== ""))
      .slice(0, 30)
      .map((r, i) => r.join("\t"))
      .join("\n");
    setAiLoading(true);
    setAiResult("");
    try {
      const res = await axios.post("/api/workspace/ai", {
        action: aiAction,
        content: dataStr,
        customPrompt: aiCustom,
        context: `Spreadsheet: ${title}`,
      });
      setAiResult(res.data.result || "No result returned.");
    } catch (e: any) {
      setAiResult("AI is unavailable. Make sure Ollama is running locally with the configured model.");
    } finally {
      setAiLoading(false);
    }
  }

  function findAll(term: string) {
    const sheet = sheets[activeSheet];
    const found: [number, number][] = [];
    sheet.data.forEach((row, ri) => row.forEach((cell, ci) => {
      if (cell.toLowerCase().includes(term.toLowerCase())) found.push([ri, ci]);
    }));
    setMatches(found);
    setMatchIdx(0);
    if (found.length) setSelectedCell(found[0]);
  }

  function replaceAll() {
    if (!findTerm) return;
    const newSheets = sheets.map((s, si) => {
      if (si !== activeSheet) return s;
      return {
        ...s,
        data: s.data.map((r) => r.map((c) => c.replace(new RegExp(findTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), replaceTerm))),
      };
    });
    setSheets(newSheets);
    scheduleSave(newSheets);
    setMatches([]);
  }

  function generateChart() {
    const sheet = sheets[activeSheet];
    if (!sheet) return;
    
    // Simple chart data generation from selected range or first few cols
    const dataRows = sheet.data.filter(r => r.some(c => c !== "")).slice(0, 10);
    const formatted = dataRows.map((r, i) => ({
      name: r[0] || `Row ${i+1}`,
      value: parseFloat(r[1]) || 0,
      extra: parseFloat(r[2]) || 0,
    }));
    setChartData(formatted);
    setShowChart(true);
  }

  const currentSheet = sheets[activeSheet] || null;
  const cellRef = selectedCell ? `${COLS[selectedCell[1]] ?? selectedCell[1]}${selectedCell[0] + 1}` : "A1";
  const cellValue = selectedCell && currentSheet ? currentSheet.data[selectedCell[0]]?.[selectedCell[1]] ?? "" : "";

  useEffect(() => {
    setFormulaBar(cellValue);
  }, [selectedCell, cellValue]);

  useEffect(() => {
    if (editCell && inputRef.current) inputRef.current.focus();
  }, [editCell]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-page">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-theme-primary/20 border-t-theme-primary animate-spin" />
          <p className="text-xs text-theme-muted animate-pulse">Loading spreadsheet…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-theme-page overflow-hidden">
      {/* ── HEADER ── */}
      <header className="h-14 bg-theme-primary flex items-center justify-between px-4 z-50 shadow-md flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href="/admin/workspace/spreadsheets" className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all flex-shrink-0">
            <ArrowLeft size={16} />
          </Link>
          <div className="h-6 w-px bg-white/20 flex-shrink-0" />
          <div className="text-xl bg-white/10 px-1.5 py-1 rounded-lg flex-shrink-0">{doc?.icon ?? "📊"}</div>
          <div className="flex flex-col flex-1 min-w-0">
            <input
              value={title}
              onChange={(e) => saveTitle(e.target.value)}
              className="bg-transparent font-bold text-white text-sm focus:outline-none placeholder:text-white/40 truncate w-full"
              placeholder="Untitled Spreadsheet"
            />
            <p className="text-[10px] text-white/60 flex items-center gap-1.5">
              <FileSpreadsheet size={9} />
              Namaah Sheets
              <span className="opacity-40">·</span>
              {saving ? "Saving…" : savedAt ? `Saved ${dayjs(savedAt).fromNow()}` : `Edited ${dayjs(doc?.last_edited_at).fromNow()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-all"
          >
            <Share2 size={13} /> Share
          </button>
          <button
            onClick={() => setShowAI(!showAI)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              showAI ? "bg-white text-theme-primary" : "bg-white/15 hover:bg-white/25 text-white"
            )}
          >
            <Sparkles size={13} /> AI
          </button>
          <div className="relative">
            <button
              onClick={() => setMenu(!menu)}
              className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all"
            >
              <MoreVertical size={16} />
            </button>
            {menu && (
              <div className="absolute right-0 top-10 z-[60] w-48 bg-theme-surface border border-theme-border rounded-xl shadow-2xl p-1.5 animate-in slide-in-from-top-2">
                <button onClick={() => { exportCSV(); setMenu(false); }}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg hover:bg-theme-raised flex items-center gap-2.5 text-theme-fg">
                  <Download size={13} className="text-theme-primary" /> Export CSV
                </button>
                <button onClick={() => { setShowFR(true); setMenu(false); }}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg hover:bg-theme-raised flex items-center gap-2.5 text-theme-fg">
                  <Search size={13} className="text-amber-500" /> Find & Replace
                </button>
                <div className="h-px bg-theme-border my-1" />
                <button onClick={() => router.push("/admin/workspace/spreadsheets")}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg hover:bg-theme-raised flex items-center gap-2.5 text-theme-fg">
                  <ArrowLeft size={13} className="text-theme-muted" /> Back to list
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── FORMULA BAR ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-theme-surface border-b border-theme-border flex-shrink-0">
        <div className="flex items-center bg-theme-raised border border-theme-border rounded-lg px-3 py-1 min-w-[60px]">
          <span className="text-[11px] font-bold text-theme-primary">{cellRef}</span>
        </div>
        <div className="h-5 w-px bg-theme-border" />
        <span className="text-xs text-theme-muted">=</span>
        <input
          value={formulaBar}
          onChange={(e) => {
            setFormulaBar(e.target.value);
            if (selectedCell) updateCell(selectedCell[0], selectedCell[1], e.target.value);
          }}
          placeholder="Enter value or formula (e.g. =SUM(A1:A10))"
          className="flex-1 bg-transparent text-xs text-theme-fg outline-none placeholder:text-theme-muted/50"
        />
      </div>

      {/* ── TOOLBAR ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-theme-surface border-b border-theme-border overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-0.5">
          <button 
            onClick={() => selectedCell && currentSheet && updateCellStyle(selectedCell[0], selectedCell[1], { bold: !(currentSheet.styles?.[`${selectedCell[0]}-${selectedCell[1]}`]?.bold) })}
            className={cn("p-1.5 rounded-lg transition-all", currentSheet?.styles?.[`${selectedCell?.[0]}-${selectedCell?.[1]}`]?.bold ? "bg-theme-primary/10 text-theme-primary" : "text-theme-muted hover:bg-theme-raised hover:text-theme-fg")} 
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button 
            onClick={() => selectedCell && currentSheet && updateCellStyle(selectedCell[0], selectedCell[1], { italic: !(currentSheet.styles?.[`${selectedCell[0]}-${selectedCell[1]}`]?.italic) })}
            className={cn("p-1.5 rounded-lg transition-all", currentSheet?.styles?.[`${selectedCell?.[0]}-${selectedCell?.[1]}`]?.italic ? "bg-theme-primary/10 text-theme-primary" : "text-theme-muted hover:bg-theme-raised hover:text-theme-fg")} 
            title="Italic"
          >
            <Italic size={14} />
          </button>
          <button 
            onClick={() => selectedCell && currentSheet && updateCellStyle(selectedCell[0], selectedCell[1], { underline: !(currentSheet.styles?.[`${selectedCell[0]}-${selectedCell[1]}`]?.underline) })}
            className={cn("p-1.5 rounded-lg transition-all", currentSheet?.styles?.[`${selectedCell?.[0]}-${selectedCell?.[1]}`]?.underline ? "bg-theme-primary/10 text-theme-primary" : "text-theme-muted hover:bg-theme-raised hover:text-theme-fg")} 
            title="Underline"
          >
            <Underline size={14} />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all" title="Strikethrough"><Strikethrough size={14} /></button>
        </div>
        <div className="h-5 w-px bg-theme-border mx-1" />
        <div className="flex items-center gap-0.5">
          <button 
            onClick={() => selectedCell && currentSheet && updateCellStyle(selectedCell[0], selectedCell[1], { align: 'left' })}
            className={cn("p-1.5 rounded-lg transition-all", currentSheet?.styles?.[`${selectedCell?.[0]}-${selectedCell?.[1]}`]?.align === 'left' ? "bg-theme-primary/10 text-theme-primary" : "text-theme-muted hover:bg-theme-raised hover:text-theme-fg")} 
            title="Align left"
          >
            <AlignLeft size={14} />
          </button>
          <button 
            onClick={() => selectedCell && currentSheet && updateCellStyle(selectedCell[0], selectedCell[1], { align: 'center' })}
            className={cn("p-1.5 rounded-lg transition-all", currentSheet?.styles?.[`${selectedCell?.[0]}-${selectedCell?.[1]}`]?.align === 'center' ? "bg-theme-primary/10 text-theme-primary" : "text-theme-muted hover:bg-theme-raised hover:text-theme-fg")} 
            title="Align center"
          >
            <AlignCenter size={14} />
          </button>
          <button 
            onClick={() => selectedCell && currentSheet && updateCellStyle(selectedCell[0], selectedCell[1], { align: 'right' })}
            className={cn("p-1.5 rounded-lg transition-all", currentSheet?.styles?.[`${selectedCell?.[0]}-${selectedCell?.[1]}`]?.align === 'right' ? "bg-theme-primary/10 text-theme-primary" : "text-theme-muted hover:bg-theme-raised hover:text-theme-fg")} 
            title="Align right"
          >
            <AlignRight size={14} />
          </button>
        </div>
        <div className="h-5 w-px bg-theme-border mx-1" />
        <div className="flex items-center gap-0.5">
          <button onClick={addRow} className="p-1.5 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all flex items-center gap-1 text-[10px] font-semibold" title="Add row">
            <Plus size={12} /> Row
          </button>
          <button onClick={addCol} className="p-1.5 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all flex items-center gap-1 text-[10px] font-semibold" title="Add column">
            <Plus size={12} /> Col
          </button>
        </div>
        <div className="h-5 w-px bg-theme-border mx-1" />
        <div className="flex items-center gap-0.5">
          <button className="p-1.5 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all" title="Filter"><Filter size={14} /></button>
          <button className="p-1.5 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all" title="Formula"><Sigma size={14} /></button>
          <button onClick={generateChart} className="p-1.5 rounded-lg hover:bg-theme-raised text-theme-muted hover:text-theme-fg transition-all" title="Chart"><BarChart2 size={14} /></button>
        </div>
        <div className="h-5 w-px bg-theme-border mx-1" />
        <button
          onClick={() => setShowAI(!showAI)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all",
            showAI ? "bg-theme-primary text-theme-surface" : "bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20"
          )}
        >
          <Sparkles size={12} /> AI Assist
        </button>
        <button
          onClick={() => { setShowFR(true); }}
          className="ml-1 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-theme-muted hover:bg-theme-raised transition-all"
        >
          <Search size={12} /> Find
        </button>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Grid */}
        <div className="flex-1 overflow-auto bg-theme-page">
          {currentSheet && (
            <table className="border-collapse text-xs table-fixed" style={{ width: "max-content" }}>
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="w-12 bg-theme-surface border border-theme-border/60" />
                  {currentSheet.data[0]?.map((_, ci) => (
                    <th
                      key={ci}
                      style={{ width: currentSheet.colWidths[ci] ?? 150 }}
                      className="bg-theme-surface border border-theme-border/60 px-2 py-1.5 text-center text-theme-muted font-semibold select-none text-[11px]"
                    >
                      {COLS[ci] ?? ci}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentSheet.data.map((row, ri) => (
                  <tr key={ri} className="group">
                    <td className="w-12 bg-theme-surface border border-theme-border/60 px-2 py-1 text-center text-theme-muted font-medium select-none text-[11px]">
                      {ri + 1}
                    </td>
                    {row.map((cell, ci) => {
                      const isSelected = selectedCell?.[0] === ri && selectedCell?.[1] === ci;
                      const isEditing = editCell?.[0] === ri && editCell?.[1] === ci;
                      const isMatch = matches.some(([r, c]) => r === ri && c === ci);
                      const displayVal = cell.startsWith("=") ? evaluateFormula(cell, currentSheet.data) : cell;
                      return (
                        <td
                          key={ci}
                          style={{ width: currentSheet.colWidths[ci] ?? 150 }}
                          onClick={() => { setSelectedCell([ri, ci]); setFormulaBar(cell); }}
                          onDoubleClick={() => setEditCell([ri, ci])}
                          className={cn(
                            "border border-theme-border/40 relative p-0 h-8 transition-all",
                            isSelected && !isEditing && "ring-2 ring-theme-primary ring-inset z-10 bg-theme-primary/5",
                            isMatch && !isSelected && "bg-amber-500/10",
                            !isSelected && !isMatch && "hover:bg-theme-surface"
                          )}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              defaultValue={cell}
                              onBlur={(e) => { updateCell(ri, ci, e.target.value); setEditCell(null); setFormulaBar(e.target.value); }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateCell(ri, ci, (e.target as HTMLInputElement).value);
                                  setEditCell(null);
                                  setSelectedCell([ri + 1, ci]);
                                }
                                if (e.key === "Tab") {
                                  e.preventDefault();
                                  updateCell(ri, ci, (e.target as HTMLInputElement).value);
                                  setEditCell(null);
                                  setSelectedCell([ri, ci + 1]);
                                }
                                if (e.key === "Escape") setEditCell(null);
                              }}
                              className="absolute inset-0 w-full h-full px-2 bg-theme-surface text-theme-fg text-xs font-medium focus:outline-none z-20 shadow-lg"
                            />
                          ) : (
                            <div 
                              className={cn(
                                "px-2 py-1 truncate text-xs transition-all", 
                                displayVal === "#ERR" ? "text-rose-500" : "text-theme-fg"
                              )}
                              style={{
                                fontWeight: currentSheet.styles?.[`${ri}-${ci}`]?.bold ? 'bold' : 'normal',
                                fontStyle: currentSheet.styles?.[`${ri}-${ci}`]?.italic ? 'italic' : 'normal',
                                textDecoration: currentSheet.styles?.[`${ri}-${ci}`]?.underline ? 'underline' : 'none',
                                textAlign: currentSheet.styles?.[`${ri}-${ci}`]?.align || 'left',
                                color: currentSheet.styles?.[`${ri}-${ci}`]?.color || undefined
                              }}
                            >
                              {displayVal}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── AI PANEL ── */}
        {showAI && (
          <div className="w-80 flex-shrink-0 border-l border-theme-border bg-theme-surface flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-theme-primary" />
                <span className="text-xs font-bold text-theme-fg">AI Assist</span>
              </div>
              <button onClick={() => setShowAI(false)} className="text-theme-muted hover:text-theme-fg">
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-theme-muted">What to do</label>
                <select
                  value={aiAction}
                  onChange={(e) => setAiAction(e.target.value)}
                  className="w-full rounded-xl border border-theme-border bg-theme-raised px-3 py-2 text-xs text-theme-fg outline-none focus:border-theme-primary"
                >
                  <optgroup label="Data Analysis">
                    <option value="analyze_data">Analyze & summarize data</option>
                    <option value="predict_values">Predict next values</option>
                    <option value="clean_data">Suggest data cleaning</option>
                    <option value="chart_suggest">Suggest best chart type</option>
                  </optgroup>
                  <optgroup label="Formulas">
                    <option value="formula_explain">Explain a formula</option>
                    <option value="formula_suggest">Suggest a formula</option>
                  </optgroup>
                  <optgroup label="Content">
                    <option value="natural_query">Ask a question about data</option>
                    <option value="generate_data">Generate sample data</option>
                    <option value="summarize">Summarize content</option>
                  </optgroup>
                </select>
              </div>

              {(aiAction === "formula_explain" || aiAction === "formula_suggest" || aiAction === "natural_query" || aiAction === "generate_data") && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-theme-muted">
                    {aiAction === "formula_explain" ? "Paste the formula" :
                     aiAction === "formula_suggest" ? "What do you want to calculate?" :
                     aiAction === "natural_query" ? "Your question" :
                     "Describe the data to generate"}
                  </label>
                  <textarea
                    value={aiCustom}
                    onChange={(e) => setAiCustom(e.target.value)}
                    rows={3}
                    placeholder={
                      aiAction === "formula_explain" ? "e.g. =VLOOKUP(A2,B:C,2,FALSE)" :
                      aiAction === "formula_suggest" ? "e.g. Calculate total sales for Q1" :
                      aiAction === "natural_query" ? "e.g. What is the average of column B?" :
                      "e.g. Employee attendance data with Name, Date, Status"
                    }
                    className="w-full rounded-xl border border-theme-border bg-theme-raised px-3 py-2 text-xs text-theme-fg outline-none focus:border-theme-primary resize-none"
                  />
                </div>
              )}

              <button
                onClick={runAI}
                disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-theme-primary py-2.5 text-xs font-semibold text-theme-surface hover:opacity-90 transition-all disabled:opacity-50"
              >
                {aiLoading ? (
                  <><div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Thinking…</>
                ) : (
                  <><Sparkles size={12} /> Run AI</>
                )}
              </button>

              {aiResult && (
                <div className="rounded-xl border border-theme-border bg-theme-raised p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-theme-muted">Result</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(aiResult)}
                      className="text-[10px] text-theme-primary hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-theme-fg leading-relaxed whitespace-pre-wrap">{aiResult}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SHEET TABS ── */}
      <footer className="h-10 bg-theme-surface border-t border-theme-border flex items-center justify-between px-3 z-50 flex-shrink-0">
        <div className="flex items-center gap-0.5 h-full">
          {sheets.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSheet(i)}
              className={cn(
                "px-4 h-full flex items-center text-xs font-semibold transition-all border-b-2",
                activeSheet === i
                  ? "text-theme-primary border-theme-primary bg-theme-primary/5"
                  : "text-theme-muted border-transparent hover:bg-theme-raised"
              )}
            >
              {s.name}
            </button>
          ))}
          <button
            onClick={addSheet}
            className="px-2 h-full flex items-center text-theme-muted hover:bg-theme-raised transition-all rounded-lg"
          >
            <Plus size={13} />
          </button>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-theme-muted">
          <span>{currentSheet?.data.length ?? 0} rows · {currentSheet?.data[0]?.length ?? 0} cols</span>
          {selectedCell && <span className="text-theme-primary font-semibold">{cellRef} selected</span>}
        </div>
      </footer>

      {/* ── FIND & REPLACE ── */}
      {showFR && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9000] w-80 rounded-2xl border border-theme-border bg-theme-surface shadow-2xl p-4 space-y-3 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-theme-fg">Find & Replace</p>
            <button onClick={() => setShowFR(false)}><X size={14} className="text-theme-muted" /></button>
          </div>
          <div className="space-y-2">
            <input
              autoFocus
              value={findTerm}
              onChange={(e) => { setFindTerm(e.target.value); findAll(e.target.value); }}
              placeholder="Find…"
              className="w-full rounded-xl border border-theme-border bg-theme-raised px-3 py-2 text-xs outline-none focus:border-theme-primary"
            />
            <input
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder="Replace with…"
              className="w-full rounded-xl border border-theme-border bg-theme-raised px-3 py-2 text-xs outline-none focus:border-theme-primary"
            />
          </div>
          {matches.length > 0 && (
            <p className="text-[10px] text-theme-muted">{matches.length} match{matches.length !== 1 ? "es" : ""} found</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={replaceAll}
              className="flex-1 rounded-xl bg-theme-primary py-2 text-xs font-semibold text-theme-surface hover:opacity-90"
            >
              Replace All
            </button>
            <button onClick={() => setShowFR(false)} className="flex-1 rounded-xl border border-theme-border py-2 text-xs font-semibold text-theme-fg hover:bg-theme-raised">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── CHART MODAL ── */}
      {showChart && (
        <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl h-[600px] rounded-3xl bg-theme-surface shadow-2xl border border-theme-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-raised/30">
              <div className="flex items-center gap-3">
                <BarChart2 size={18} className="text-theme-primary" />
                <h3 className="text-sm font-bold text-theme-fg">Chart: {title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-xl border border-theme-border bg-theme-surface p-1">
                  {(["bar", "line", "pie", "area"] as const).map(t => (
                    <button key={t} onClick={() => setChartType(t)}
                      className={cn("px-3 py-1 text-[10px] font-bold rounded-lg transition-all capitalize", 
                        chartType === t ? "bg-theme-primary text-white shadow-sm" : "text-theme-muted hover:text-theme-fg hover:bg-theme-raised"
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowChart(false)} className="rounded-xl p-2 text-theme-muted hover:bg-theme-raised transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-8 bg-white/50">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="extra" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : chartType === "line" ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="extra" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 6 }} />
                  </LineChart>
                ) : chartType === "area" ? (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="#10B981" fillOpacity={0.2} fill="url(#colorVal)" />
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="p-4 border-t border-theme-border bg-theme-surface flex justify-end">
              <button onClick={() => setShowChart(false)} className="rounded-xl bg-theme-fg text-theme-surface px-6 py-2 text-xs font-bold hover:opacity-90 transition-all">
                Close Chart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE MODAL ── */}
      {showShare && doc && user && (
        <ShareModal
          itemId={id}
          itemType="spreadsheet"
          itemTitle={title}
          currentUserId={user.id}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
