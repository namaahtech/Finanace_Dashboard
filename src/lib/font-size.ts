// Per-device UI text-size preference. The whole app is rem-based (root html
// font-size = the global scale), so overriding the root font-size in px scales
// every screen uniformly. An inline <head> script (see app/layout.tsx) applies
// the saved value before first paint to avoid a flash; here we read/apply/save
// it at runtime for the picker in My Profile.

export const FONT_SIZE_KEY = "nexus-font-px";

/** Base root font-size the app ships with (globals.css: html { font-size:14px }). */
export const DEFAULT_FONT_PX = 14;

export interface FontSizeOption {
  id: string;
  label: string;
  px: number;
  note: string;
}

// px maps directly to the root html font-size. "Default" carries the app's base.
export const FONT_SIZES: FontSizeOption[] = [
  { id: "compact", label: "Compact",     px: 12, note: "Fit more on screen" },
  { id: "small",   label: "Small",       px: 13, note: "Slightly tighter" },
  { id: "default", label: "Default",     px: 14, note: "Recommended" },
  { id: "large",   label: "Large",       px: 16, note: "Easier to read" },
  { id: "xlarge",  label: "Extra Large", px: 18, note: "Maximum readability" },
];

/** The saved px, or null when the user is on the (dynamic) default. */
export function getSavedFontPx(): number | null {
  try {
    const v = localStorage.getItem(FONT_SIZE_KEY);
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Apply a size live. Pass null to clear the override and fall back to the
 *  responsive default (14px, or 15px on very large screens). */
export function applyFontPx(px: number | null): void {
  const el = document.documentElement;
  if (px == null) el.style.removeProperty("font-size");
  else el.style.fontSize = `${px}px`;
}

/** Persist (or clear) the preference for future page loads. */
export function saveFontPx(px: number | null): void {
  try {
    if (px == null) localStorage.removeItem(FONT_SIZE_KEY);
    else localStorage.setItem(FONT_SIZE_KEY, String(px));
  } catch {
    /* storage unavailable — the live apply still works for this session */
  }
}
