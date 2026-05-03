"use client";

import { useEffect, useState, useRef } from "react";
import { CheckCircle2, ArrowRightLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectProps {
  value: string[];
  options: { label: string; value: string }[];
  onChange: (val: string[]) => void;
  placeholder: string;
  icon?: React.ReactNode;
  label?: string;
}

export function MultiSelect({ value, options, onChange, placeholder, icon, label }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: string) => {
    if (value.includes(val)) onChange(value.filter((v) => v !== val));
    else onChange([...value, val]);
  };

  return (
    <div className="space-y-2" ref={ref}>
      {label && (
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-theme-muted">
          {icon}
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex min-h-[46px] w-full items-center justify-between rounded-2xl border border-theme-border bg-theme-page px-4 py-2 text-sm font-bold text-theme-fg outline-none focus:border-theme-strong transition-all overflow-hidden"
        >
          <div className="flex flex-wrap gap-1.5 items-center pr-2">
            {!label && icon}
            {value.length > 0 ? (
              value.map((v) => {
                const opt = options.find((o) => o.value === v);
                return (
                  <span
                    key={v}
                    className="bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border border-theme-primary/20"
                  >
                    {opt?.label}
                  </span>
                );
              })
            ) : (
              <span className="text-theme-muted font-normal">{placeholder}</span>
            )}
          </div>
          <ArrowRightLeft
            size={14}
            className={cn("flex-shrink-0 text-theme-muted transition-transform rotate-90", open && "rotate-[270deg]")}
          />
        </button>

        {open && (
          <div className="absolute top-full z-[8000] mt-1.5 w-full max-h-48 overflow-y-auto rounded-2xl border border-theme-border bg-theme-surface shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-1.5 animate-in slide-in-from-top-1 duration-200">
            {options.length > 0 ? (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                    value.includes(opt.value) ? "bg-theme-primary/10 text-theme-primary" : "text-theme-fg hover:bg-theme-raised"
                  )}
                >
                  <span className="truncate uppercase tracking-tight">{opt.label}</span>
                  {value.includes(opt.value) && <CheckCircle2 size={12} className="flex-shrink-0" />}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-[10px] uppercase font-black tracking-widest text-theme-muted opacity-50">
                No Data Options
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiSelect;
