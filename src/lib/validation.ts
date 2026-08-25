// Shared, framework-agnostic input validators used across the recruitment /
// onboarding forms (manual entry, interview entry, onboarding builder). Each
// returns an error string when invalid, or null when the value is acceptable.
// Keep these pure so they can drive both live field feedback and submit guards.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Legal-name characters: letters (incl. accents), spaces, apostrophes, hyphens,
// and dots (initials). No digits or other symbols.
const NAME_RE = /^[\p{L}][\p{L}\s.'-]*$/u;

/** Full legal name — required, min 2 chars, letters only. */
export function validateName(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Name is required";
  if (v.length < 2) return "Please enter the full name";
  if (v.length > 80) return "Name is too long";
  if (!NAME_RE.test(v)) return "Use letters only — no numbers or symbols";
  if (!/\p{L}{2,}/u.test(v)) return "Please enter a valid name";
  return null;
}

/** Email — required, standard shape. */
export function validateEmail(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Email is required";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address";
  if (v.length > 254) return "Email is too long";
  return null;
}

/**
 * Phone number. `required` defaults to false (many forms mark phone optional).
 * Accepts an optional leading "+" and country code, spaces, dashes, parens and
 * dots as separators; requires 10–15 digits (E.164 range). Enforces a 10-digit
 * Indian mobile (starting 6–9) when no country code is given.
 */
export function validatePhone(raw: string, required = false): string | null {
  const v = raw.trim();
  if (!v) return required ? "Phone number is required" : null;
  if (!/^[+\d][\d\s().-]*$/.test(v)) return "Only digits, spaces and + ( ) - are allowed";
  const hasPlus = v.startsWith("+");
  const digits = v.replace(/\D/g, "");
  if (hasPlus) {
    if (digits.length < 10 || digits.length > 15) return "Enter a valid phone number with country code";
    return null;
  }
  if (digits.length !== 10) return "Enter a valid 10-digit mobile number";
  if (!/^[6-9]/.test(digits)) return "Indian mobile numbers start with 6–9";
  return null;
}

/** Address — optional, but if present enforce a sane length. */
export function validateAddress(raw: string, required = false): string | null {
  const v = raw.trim();
  if (!v) return required ? "Address is required" : null;
  if (v.length < 4) return "Please enter a fuller address";
  if (v.length > 250) return "Address is too long";
  return null;
}
