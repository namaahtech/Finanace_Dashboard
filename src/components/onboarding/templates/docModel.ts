// Document block model shared by the auto-generated content modules and the templates.

export type DocBlockKind = "t" | "s" | "h" | "b" | "li";
export interface DocBlock {
  k: DocBlockKind; // t=section title, s=numbered section, h=sub-heading, b=body, li=list item
  t: string;
}

/**
 * Return the slice of blocks beginning at the first block whose text starts with
 * `start` (inclusive) up to the first block whose text starts with `end` (exclusive).
 * If `end` is omitted, returns to the end of the array.
 */
export function sliceBlocks(blocks: DocBlock[], start: string, end?: string): DocBlock[] {
  const startIdx = blocks.findIndex((b) => b.t.startsWith(start));
  if (startIdx === -1) return [];
  const rest = blocks.slice(startIdx);
  if (!end) return rest;
  const endIdx = rest.findIndex((b, i) => i > 0 && b.t.startsWith(end));
  return endIdx === -1 ? rest : rest.slice(0, endIdx);
}
