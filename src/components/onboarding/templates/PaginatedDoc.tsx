"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { HEADER_MM, FOOTER_MM } from "./brand";
import { LetterheadHeader, LetterheadFooter } from "./docStyles";

const PX_PER_MM = 96 / 25.4; // 3.7795 — CSS px per mm at 96dpi
// Usable content height per page = A4 height − header − footer − body vertical padding (5mm × 2).
const USABLE_PX = (297 - HEADER_MM - FOOTER_MM - 10) * PX_PER_MM;

/**
 * Splits a flat list of flowable block nodes into discrete A4 pages, each carrying
 * the NAMAAH letterhead header (top) and footer (bottom) — mirroring the Word doc.
 * Whole-block pagination: a block never splits across pages.
 */
export function PaginatedDoc({ blocks }: { blocks: React.ReactNode[] }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([[...blocks.keys()]]);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    if (!children.length) { setPages([[]]); return; }

    const result: number[][] = [];
    let current: number[] = [];
    let pageTop = children[0].offsetTop;

    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      const forceBreak = c.classList.contains("od-break-before"); // admin-set "start on new page"
      const bottom = c.offsetTop + c.offsetHeight;
      if (current.length && (forceBreak || bottom - pageTop > USABLE_PX)) {
        result.push(current);
        current = [];
        pageTop = c.offsetTop;
      }
      current.push(i);
    }
    if (current.length) result.push(current);
    setPages(result.length ? result : [[]]);
  }, [blocks]);

  return (
    <div className="od-paged-root">
      {/* Hidden measurer — same width/font as page body so measured heights match. */}
      <div ref={measureRef} className="od-measure" aria-hidden>
        {blocks}
      </div>

      {pages.map((idxs, p) => (
        <div className="od-page" key={p}>
          <LetterheadHeader />
          <div className="od-page-body">{idxs.map((i) => blocks[i])}</div>
          <LetterheadFooter />
        </div>
      ))}
    </div>
  );
}
