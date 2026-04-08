"use client";

import { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
} from "lucide-react";

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, label, placeholder = "Select Date", disabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(dayjs(value || undefined));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setCurrentDate(dayjs(value));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectDate = (date: dayjs.Dayjs) => {
    const formatted = date.format("YYYY-MM-DD");
    onChange(formatted);
    setIsOpen(false);
  };

  const moveMonth = (offset: number) => {
    setCurrentDate(currentDate.add(offset, "month"));
  };

  const moveYear = (offset: number) => {
    setCurrentDate(currentDate.add(offset, "year"));
  };

  const startOfMonth = currentDate.startOf("month");
  const endOfMonth = currentDate.endOf("month");
  const daysInMonth = currentDate.daysInMonth();
  const startDay = startOfMonth.day();
  
  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(startOfMonth.date(i));
  }

  const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const currentYear = currentDate.year();

  return (
    <div className="relative w-full space-y-1" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{label}</label>}
      
      <div className="relative group cursor-pointer" onClick={() => !disabled && setIsOpen(!isOpen)}>
        <input
          type="text"
          value={value ? dayjs(value).format("YYYY-MM-DD") : ""}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-slate-100 bg-slate-50 pl-10 pr-4 py-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all font-semibold cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={14} />
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-[1000] w-[270px] bg-white enterprise-card shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Compact Calendar Header */}
          <div className="p-3 border-b border-slate-50 bg-slate-50/50 flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-0.5 bg-white border border-slate-100 p-0.5 rounded-lg">
                 <button onClick={(e) => { e.stopPropagation(); moveYear(-1); }} className="p-1 hover:bg-slate-50 rounded-md transition-colors text-slate-400 hover:text-slate-900"><ChevronLeft size={14} /></button>
                 <span className="text-[10px] font-black text-slate-900 tabular-nums px-1.5">{currentYear}</span>
                 <button onClick={(e) => { e.stopPropagation(); moveYear(1); }} className="p-1 hover:bg-slate-50 rounded-md transition-colors text-slate-400 hover:text-slate-900"><ChevronRight size={14} /></button>
              </div>
              <div className="flex items-center gap-0.5 bg-white border border-slate-100 p-0.5 rounded-lg">
                 <button onClick={(e) => { e.stopPropagation(); moveMonth(-1); }} className="p-1 hover:bg-slate-50 rounded-md transition-colors text-slate-400 hover:text-slate-900"><ChevronLeft size={14} /></button>
                 <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest px-1.5 min-w-[70px] text-center">{months[currentDate.month()]}</span>
                 <button onClick={(e) => { e.stopPropagation(); moveMonth(1); }} className="p-1 hover:bg-slate-50 rounded-md transition-colors text-slate-400 hover:text-slate-900"><ChevronRight size={14} /></button>
              </div>
            </div>
          </div>

          {/* Compact Days Grid */}
          <div className="p-3">
             <div className="grid grid-cols-7 mb-2 px-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={`${d}-${i}`} className="text-center text-[8px] font-black text-slate-300 uppercase">{d}</div>
                ))}
             </div>
             <div className="grid grid-cols-7 gap-y-0.5 px-0.5">
                {days.map((day, idx) => (
                  <button
                    key={idx}
                    disabled={!day}
                    onClick={(e) => { e.stopPropagation(); day && selectDate(day); }}
                    className={cn(
                      "h-8 w-8 flex items-center justify-center text-[10px] font-bold rounded-md transition-all mx-auto",
                      !day ? "cursor-default" : 
                      dayjs(value).isSame(day, 'day') 
                        ? "bg-slate-900 text-white shadow-md scale-105" 
                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-900",
                      day?.isSame(dayjs(), 'day') && !dayjs(value).isSame(day, 'day') && "text-emerald-600 font-extrabold"
                    )}
                  >
                    {day ? day.date() : ""}
                  </button>
                ))}
             </div>
          </div>

          {/* Compact Footer */}
          <div className="px-3 py-2 border-t border-slate-50 bg-slate-50/50 flex justify-between items-center">
             <button
               onClick={(e) => { e.stopPropagation(); selectDate(dayjs()); }}
               className="text-[9px] font-black text-slate-900 uppercase tracking-widest hover:opacity-70 transition-opacity"
             >
               Set Today
             </button>
             <button
               onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
               className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
             >
               Dismiss
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
