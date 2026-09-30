"use client";

import { useEffect, useState } from "react";
import { Type, Check, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/ButtonLegacy";
import { cn } from "@/lib/utils";
import {
  FONT_SIZES, DEFAULT_FONT_PX, getSavedFontPx, applyFontPx, saveFontPx,
} from "@/lib/font-size";

// Appearance → Text Size. Lets a user scale the whole UI (the app is rem-based,
// so the root font-size drives every screen). A live demo previews the choice;
// Save shows a glassy full-screen loader and reloads so the new size takes hold
// everywhere. "Default" clears the override and returns to the app's dynamic size.
export function TextSizeCard() {
  const [selected, setSelected] = useState<number>(DEFAULT_FONT_PX);
  const [saved, setSaved] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const s = getSavedFontPx();
    setSaved(s);
    setSelected(s ?? DEFAULT_FONT_PX);
  }, []);

  const isDefault = (px: number) => px === DEFAULT_FONT_PX;
  const currentSaved = saved ?? DEFAULT_FONT_PX;
  const dirty = selected !== currentSaved;

  function commit(px: number) {
    setApplying(true);
    // "Default" clears the override so the app keeps its responsive default;
    // any other size is persisted explicitly.
    const toSave = isDefault(px) ? null : px;
    saveFontPx(toSave);
    applyFontPx(toSave);
    // Brief glassy hold, then a full reload so every already-rendered screen
    // picks up the new root size cleanly.
    setTimeout(() => window.location.reload(), 750);
  }

  return (
    <div className="page-card overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-theme-border px-5 py-4">
        <Type size={15} className="text-theme-muted" />
        <h3 className="text-sm font-semibold text-theme-fg">Text Size</h3>
        <span className="ml-auto text-[11px] text-theme-muted">Applies across the whole app</span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Options */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {FONT_SIZES.map((o) => {
            const active = selected === o.px;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelected(o.px)}
                aria-pressed={active}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl border px-3 py-3 transition-all",
                  active
                    ? "border-theme-primary bg-theme-primary/10 shadow-sm ring-1 ring-theme-primary/40"
                    : "border-theme-border bg-theme-raised hover:border-theme-primary/40",
                )}
              >
                {active && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-theme-primary text-white">
                    <Check size={11} />
                  </span>
                )}
                <span className="font-bold text-theme-fg" style={{ fontSize: `${o.px + 2}px`, lineHeight: 1 }}>Aa</span>
                <span className="text-[11px] font-semibold text-theme-fg">{o.label}</span>
                <span className="text-[9px] leading-tight text-theme-muted text-center">{o.note}</span>
                {isDefault(o.px) && (
                  <span className="mt-0.5 rounded-full bg-theme-border px-1.5 text-[8px] font-bold uppercase tracking-wide text-theme-muted">Default</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live demo — sample text scaled to the selected root size (em-based,
            so it mirrors how the real UI would render). */}
        <div className="rounded-xl border border-theme-border bg-theme-surface p-4" style={{ fontSize: `${selected}px` }}>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-theme-muted" style={{ fontSize: "0.65em" }}>Live preview</p>
          <p className="font-black text-theme-fg" style={{ fontSize: "1.15em" }}>Namaah Nexus</p>
          <p className="text-theme-fg" style={{ fontSize: "1em" }}>The quick brown fox jumps over the lazy dog.</p>
          <p className="text-theme-muted" style={{ fontSize: "0.85em" }}>Buttons, tables, and menus scale with this size.</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => commit(selected)}
            disabled={!dirty || applying}
            className="min-w-[130px]"
          >
            {applying ? <><Loader2 size={13} className="mr-1.5 animate-spin" /> Applying…</> : <>Save &amp; Apply</>}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelected(DEFAULT_FONT_PX)}
            disabled={selected === DEFAULT_FONT_PX || applying}
          >
            <RotateCcw size={13} className="mr-1.5" /> Reset to Default
          </Button>
          {!dirty && !applying && (
            <span className="text-[11px] text-theme-muted">
              Current: <strong className="text-theme-fg">{FONT_SIZES.find((f) => f.px === currentSaved)?.label ?? `${currentSaved}px`}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Glassy full-screen loader shown on save, then the page reloads. */}
      {applying && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3 bg-background/40 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-background/60 px-8 py-6 shadow-2xl">
            <Loader2 size={30} className="animate-spin text-theme-primary" />
            <p className="text-sm font-semibold text-theme-fg">Applying your text size…</p>
            <p className="text-[11px] text-theme-muted">Reloading so it applies everywhere</p>
          </div>
        </div>
      )}
    </div>
  );
}
