// Engagement terminology for the onboarding documents.
//
// The Offer Letter, NDA and Handbook were authored as internship documents (~585
// occurrences of intern/internship across the three). When HR marks a candidate as
// a direct full-time hire, the documents must read as employment documents rather
// than telling a full-time employee they're on an internship.
//
// Rather than maintaining two divergent copies of a long legal text, the wording is
// derived from the single internship source at render time. Same clauses, same
// numbering, same structure — only the engagement vocabulary changes.

export type EmploymentType = "intern" | "full_time";

// Case-preserving pairs. Every casing variant is listed explicitly so a single
// regex pass can map each token without a second pass re-replacing its own output.
const TERMS: Record<string, string> = {
  // ALL CAPS (section headings, acknowledgement captions)
  INTERNSHIPS: "EMPLOYMENT",
  INTERNSHIP: "EMPLOYMENT",
  INTERNS: "EMPLOYEES",
  INTERN: "EMPLOYEE",
  STIPEND: "SALARY",
  // Title Case (defined terms — "the Intern", "the Internship")
  Internships: "Employment",
  Internship: "Employment",
  Interns: "Employees",
  Intern: "Employee",
  Stipends: "Salaries",
  Stipend: "Salary",
  // lower case (running prose)
  internships: "employment",
  internship: "employment",
  interns: "employees",
  intern: "employee",
  stipends: "salaries",
  stipend: "salary",
};

// \b boundaries keep "internal", "international" and "internet" untouched —
// they contain "intern" as a prefix but not as a whole word.
const TERM_RE = new RegExp(`\\b(${Object.keys(TERMS).join("|")})\\b`, "g");

/**
 * Rewrite internship vocabulary as employment vocabulary. A no-op for interns, so
 * the internship documents render exactly as authored.
 */
export function applyEngagementTerms(text: string, type: EmploymentType): string {
  if (type !== "full_time" || !text) return text;
  return text.replace(TERM_RE, (m) => TERMS[m] ?? m);
}

/** Convenience for building a transformer once and reusing it across a document. */
export function termsFor(type: EmploymentType): (text: string) => string {
  if (type !== "full_time") return (t) => t;
  return (t) => applyEngagementTerms(t, "full_time");
}

/**
 * Apply the transform to a slice of authored document blocks.
 *
 * IMPORTANT: slice first, then map. `sliceBlocks` matches on the authored
 * internship headings ("INTERN HANDBOOK ACKNOWLEDGEMENT"), so transforming before
 * slicing would break every boundary lookup.
 */
export function mapBlocks<T extends { k: string; t: string }>(blocks: T[], transform: (s: string) => string): T[] {
  return blocks.map((b) => ({ ...b, t: transform(b.t) }));
}
