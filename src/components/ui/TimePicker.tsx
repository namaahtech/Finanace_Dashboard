"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // HH:MM:SS format
  onChange: (time: string) => void;
  label?: string;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, label, disabled = false }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState("09");
  const [minutes, setMinutes] = useState("00");
  const [period, setPeriod] = useState("AM");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  // Parse incoming value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":").slice(0, 2);
      const hNum = parseInt(h);
      const isPM = hNum >= 12;
      const display12h = hNum === 0 ? 12 : hNum > 12 ? hNum - 12 : hNum;

      setHours(String(display12h).padStart(2, "0"));
      setMinutes(m || "00");
      setPeriod(isPM ? "PM" : "AM");
    }
  }, [value]);

  // Convert 12-hour to 24-hour and emit
  const handleTimeChange = (h: string, m: string, p: string) => {
    let hour24 = parseInt(h);
    if (p === "PM" && hour24 !== 12) hour24 += 12;
    if (p === "AM" && hour24 === 12) hour24 = 0;

    const formattedTime = `${String(hour24).padStart(2, "0")}:${m}:00`;
    onChange(formattedTime);
  };

  const handleHourChange = (h: string) => {
    setHours(h);
    handleTimeChange(h, minutes, period);
  };

  const handleMinuteChange = (m: string) => {
    setMinutes(m);
    handleTimeChange(hours, m, period);
  };

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    handleTimeChange(hours, minutes, p);
  };

  // Auto-scroll to selected value
  useEffect(() => {
    if (isOpen && hoursRef.current) {
      const selected = hoursRef.current.querySelector(`[data-value="${hours}"]`) as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [isOpen, hours]);

  useEffect(() => {
    if (isOpen && minutesRef.current) {
      const selected = minutesRef.current.querySelector(`[data-value="${minutes}"]`) as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [isOpen, minutes]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const displayTime = `${hours}:${minutes} ${period}`;

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-theme-muted mb-2">{label}</label>}

      <div ref={dropdownRef} className="relative">
        {/* Main Time Display Button */}
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "w-full h-11 px-4 rounded-xl border transition-all flex items-center justify-between",
            "font-mono text-sm font-semibold",
            disabled
              ? "bg-theme-page/50 border-theme-border/50 text-theme-muted cursor-not-allowed"
              : "bg-theme-page border-theme-border hover:border-theme-primary/50 text-theme-fg",
            isOpen && "border-theme-primary bg-theme-raised shadow-lg"
          )}
        >
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-theme-muted" />
            <span>{displayTime}</span>
          </div>
          <ChevronDown
            size={16}
            className={cn(
              "text-theme-muted transition-transform duration-300",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-theme-surface border border-theme-border rounded-xl shadow-xl overflow-hidden z-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-theme-primary/10 to-theme-primary/5 px-4 py-3 border-b border-theme-border">
              <p className="text-xs font-semibold text-theme-muted uppercase tracking-wider">Select Time</p>
            </div>

            {/* Time Picker Grid */}
            <div className="grid grid-cols-3 gap-0 p-4">
              {/* Hours */}
              <div className="flex flex-col">
                <p className="text-xs font-bold text-theme-muted mb-2 text-center">Hour</p>
                <div
                  ref={hoursRef}
                  className="flex flex-col gap-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-theme-border scrollbar-track-theme-page"
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                    <button
                      key={h}
                      data-value={h}
                      onClick={() => handleHourChange(h)}
                      className={cn(
                        "h-8 text-sm font-semibold rounded-lg transition-all",
                        hours === h
                          ? "bg-theme-primary text-theme-surface shadow-md scale-105"
                          : "bg-theme-page text-theme-fg hover:bg-theme-raised"
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center justify-center">
                <div className="h-32 w-0.5 bg-theme-border rounded-full"></div>
              </div>

              {/* Minutes */}
              <div className="flex flex-col">
                <p className="text-xs font-bold text-theme-muted mb-2 text-center">Min</p>
                <div
                  ref={minutesRef}
                  className="flex flex-col gap-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-theme-border scrollbar-track-theme-page"
                >
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
                    <button
                      key={m}
                      data-value={m}
                      onClick={() => handleMinuteChange(m)}
                      className={cn(
                        "h-8 text-sm font-semibold rounded-lg transition-all",
                        minutes === m
                          ? "bg-theme-primary text-theme-surface shadow-md scale-105"
                          : "bg-theme-page text-theme-fg hover:bg-theme-raised"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AM/PM Toggle */}
            <div className="border-t border-theme-border px-4 py-3 flex gap-2">
              {["AM", "PM"].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={cn(
                    "flex-1 h-9 rounded-lg font-bold text-sm transition-all",
                    period === p
                      ? "bg-theme-primary text-theme-surface shadow-md"
                      : "bg-theme-page text-theme-muted hover:bg-theme-raised border border-theme-border"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Now Button */}
            <div className="border-t border-theme-border px-4 py-2">
              <button
                onClick={() => {
                  const now = new Date();
                  const h = now.getHours();
                  const m = now.getMinutes();
                  const isPM = h >= 12;
                  const display12h = h === 0 ? 12 : h > 12 ? h - 12 : h;

                  setHours(String(display12h).padStart(2, "0"));
                  setMinutes(String(m).padStart(2, "0"));
                  setPeriod(isPM ? "PM" : "AM");
                  handleTimeChange(String(display12h).padStart(2, "0"), String(m).padStart(2, "0"), isPM ? "PM" : "AM");
                }}
                className="w-full h-8 text-xs font-bold text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-all"
              >
                ↺ Set to Current Time
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
