"use client";

import { useEffect, useRef } from "react";
import { isPayrollInternOnly, PAYROLL_INTERN_HOME } from "@/lib/payroll-access";
import { useAuth } from "./AuthProvider";

export function InternActivityTracker() {
  const { user } = useAuth();
  const lastActiveRef = useRef<number>(Date.now());
  const isInactiveRef = useRef<boolean>(false);

  useEffect(() => {
    if (!user || !isPayrollInternOnly(user.email)) return;

    // 1. Setup global click tracker
    const handleClick = (e: MouseEvent) => {
      resetIdleTimer();
      const target = e.target as HTMLElement;
      
      // Determine what was clicked (button, link, option, select, tab, checkbox)
      const clickable = target.closest("button, a, [role='button'], input[type='checkbox'], input[type='radio'], select");
      if (!clickable) return;

      const tag = clickable.tagName.toLowerCase();
      let text = clickable.textContent?.trim() || "";
      const id = clickable.id;
      const name = clickable.getAttribute("name") || "";
      const title = clickable.getAttribute("title") || clickable.getAttribute("aria-label") || "";

      // Clean up text if it contains large child whitespace
      text = text.replace(/\s+/g, " ");
      if (text.length > 60) text = text.slice(0, 57) + "...";

      // Look if it's inside a table row to see if we can associate it with an intern
      const tr = clickable.closest("tr");
      let internName = "";
      if (tr) {
        const td = tr.querySelector("td");
        if (td) {
          internName = td.querySelector(".font-medium")?.textContent?.trim() || td.textContent?.trim() || "";
          internName = internName.replace(/\s+/g, " ").trim();
        }
      }

      let summary = "";
      if (internName) {
        summary = `Clicked "${text || id || name || "action"}" for ${internName}`;
      } else {
        if (tag === "a") {
          summary = `Clicked link: "${text || title || id || "Navigation"}"`;
        } else {
          summary = `Clicked button: "${text || title || id || name || "action"}"`;
        }
      }

      logActivity("intern.click", summary);
    };

    // 2. Setup input blur/change tracker
    const handleInputBlur = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") return;
      
      const value = target.value;
      const placeholder = target.placeholder || target.getAttribute("name") || target.id || "input";

      // If it is in a table row, find the intern name
      const tr = target.closest("tr");
      let internName = "";
      if (tr) {
        const td = tr.querySelector("td");
        if (td) {
          internName = td.querySelector(".font-medium")?.textContent?.trim() || td.textContent?.trim() || "";
          internName = internName.replace(/\s+/g, " ").trim();
        }
      }

      let summary = "";
      if (internName) {
        summary = `Updated field "${placeholder}" for ${internName} to "${value}"`;
      } else {
        summary = `Updated field "${placeholder}" to "${value}"`;
      }

      logActivity("intern.input", summary);
    };

    const handleSelectChange = (e: Event) => {
      const target = e.target as HTMLSelectElement;
      if (target.tagName !== "SELECT") return;

      const value = target.options[target.selectedIndex]?.text || target.value;
      const name = target.getAttribute("name") || target.id || "dropdown";

      logActivity("intern.select", `Changed dropdown "${name}" selection to "${value}"`);
    };

    // 3. Setup idle/inactivity detector
    const IDLE_TIMEOUT = 120000; // 2 minutes in ms
    
    const resetIdleTimer = () => {
      if (isInactiveRef.current) {
        // Calculate duration
        const durationMs = Date.now() - lastActiveRef.current;
        const durationStr = formatDuration(durationMs);
        logActivity("intern.active", `Resumed activity (was inactive for ${durationStr})`);
        
        // Report presence status update
        fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "available" }),
        }).catch(() => {});
        
        isInactiveRef.current = false;
      }
      lastActiveRef.current = Date.now();
    };

    // Activity triggers
    const activityEvents = ["mousemove", "mousedown", "keypress", "scroll", "touchstart"];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));

    // Click, blur, change listeners
    document.addEventListener("click", handleClick, true);
    document.addEventListener("blur", handleInputBlur, true);
    document.addEventListener("change", handleSelectChange, true);

    // Periodically check if idle
    const checkIdle = setInterval(() => {
      const elapsed = Date.now() - lastActiveRef.current;
      if (elapsed >= IDLE_TIMEOUT && !isInactiveRef.current) {
        isInactiveRef.current = true;
        logActivity("intern.became_inactive", "Became inactive");
        
        // Report presence status update
        fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "idle" }),
        }).catch(() => {});
      }
    }, 10000);

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("blur", handleInputBlur, true);
      document.removeEventListener("change", handleSelectChange, true);
      clearInterval(checkIdle);
    };
  }, [user]);

  return null;
}

// Helpers
function logActivity(action: string, summary: string) {
  fetch("/api/interns/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, summary, section: "Internship" }),
  }).catch(() => {});
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
