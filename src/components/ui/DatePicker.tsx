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
 {label && <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest block">{label}</label>}
 
 <div className="relative group cursor-pointer" onClick={() => !disabled && setIsOpen(!isOpen)}>
 <input
 type="text"
 value={value ? dayjs(value).format("YYYY-MM-DD") : ""}
 placeholder={placeholder}
 readOnly
 disabled={disabled}
 className={cn(
 "w-full rounded-lg border border-theme-border bg-theme-input pl-10 pr-4 py-2.5 text-xs text-theme-fg outline-none focus:bg-theme-surface focus:border-theme-strong transition-all font-semibold cursor-pointer",
 disabled && "opacity-50 cursor-not-allowed"
 )}
 />
 <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-subtle group-focus-within:text-theme-fg transition-colors" size={14} />
 </div>

 {isOpen && !disabled && (
 <div className="absolute top-[calc(100%+4px)] left-0 z-[6000] w-[225px] bg-theme-surface enterprise-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
 {/* Compact Calendar Header */}
 <div className="p-2 border-b border-theme-border bg-theme-raised/50 flex flex-col gap-2">
 <div className="flex justify-between items-center px-1">
 <div className="flex items-center gap-0.5 bg-theme-surface border border-theme-border p-0.5 rounded-lg">
 <button onClick={(e) => { e.stopPropagation(); moveYear(-1); }} className="p-1 hover:bg-theme-raised rounded-md transition-colors text-theme-subtle hover:text-theme-fg"><ChevronLeft size={14} /></button>
 <span className="text-[10px] font-black text-theme-fg tabular-nums px-1.5">{currentYear}</span>
 <button onClick={(e) => { e.stopPropagation(); moveYear(1); }} className="p-1 hover:bg-theme-raised rounded-md transition-colors text-theme-subtle hover:text-theme-fg"><ChevronRight size={14} /></button>
 </div>
 <div className="flex items-center gap-0.5 bg-theme-surface border border-theme-border p-0.5 rounded-lg">
 <button onClick={(e) => { e.stopPropagation(); moveMonth(-1); }} className="p-1 hover:bg-theme-raised rounded-md transition-colors text-theme-subtle hover:text-theme-fg"><ChevronLeft size={14} /></button>
 <span className="text-[9px] font-black text-theme-fg uppercase tracking-widest px-1.5 min-w-[70px] text-center">{months[currentDate.month()]}</span>
 <button onClick={(e) => { e.stopPropagation(); moveMonth(1); }} className="p-1 hover:bg-theme-raised rounded-md transition-colors text-theme-subtle hover:text-theme-fg"><ChevronRight size={14} /></button>
 </div>
 </div>
 </div>

 {/* Compact Days Grid */}
 <div className="p-2">
 <div className="grid grid-cols-7 mb-1 px-1">
 {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
 <div key={`${d}-${i}`} className="text-center text-[7px] font-black text-theme-subtle uppercase">{d}</div>
 ))}
 </div>
 <div className="grid grid-cols-7 gap-y-0.5 px-0.5">
 {days.map((day, idx) => (
 <button
 key={idx}
 disabled={!day}
 onClick={(e) => { e.stopPropagation(); day && selectDate(day); }}
 className={cn(
 "h-[26px] w-[26px] flex items-center justify-center text-[9px] font-bold rounded-md transition-all mx-auto",
 !day ? "cursor-default" : 
 dayjs(value).isSame(day, 'day') 
 ? "bg-theme-primary text-theme-surface shadow-md scale-105" 
 : "hover:bg-theme-raised text-theme-muted hover:text-theme-fg",
 day?.isSame(dayjs(), 'day') && !dayjs(value).isSame(day, 'day') && "text-emerald-600 font-extrabold"
 )}
 >
 {day ? day.date() : ""}
 </button>
 ))}
 </div>
 </div>

 {/* Compact Footer */}
 <div className="px-3 py-2 border-t border-theme-border bg-theme-raised/50 flex justify-between items-center">
 <button
 onClick={(e) => { e.stopPropagation(); selectDate(dayjs()); }}
 className="text-[9px] font-black text-theme-fg uppercase tracking-widest hover:opacity-70 transition-opacity"
 >
 Set Today
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
 className="text-[9px] font-black text-theme-subtle uppercase tracking-widest hover:text-theme-fg transition-colors"
 >
 Dismiss
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
