"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Shared pagination control used across every list in the app, so page size,
// keyboard targets and wording stay identical everywhere.
//
// Page size matters beyond ergonomics here: several tables hold large rows, and
// rendering "everything" is what drove the Supabase egress bill. Defaulting to a
// bounded page keeps reads small.

export const PAGE_SIZE_OPTIONS = [5, 10, 50, 100, 500] as const;
export const DEFAULT_PAGE_SIZE = 10;

export interface PaginationProps {
  /** Zero-based current page index. */
  page: number;
  pageSize: number;
  /** Total number of rows across all pages. */
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Singular noun for the row type, e.g. "file" → "files". */
  itemLabel?: string;
  className?: string;
  /** Hide the rows-per-page selector (e.g. in tight side panels). */
  hidePageSize?: boolean;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  itemLabel = "item",
  className,
  hidePageSize = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages - 1);
  const first = total === 0 ? 0 : current * pageSize + 1;
  const last = Math.min((current + 1) * pageSize, total);
  const plural = total === 1 ? itemLabel : `${itemLabel}s`;

  return (
    <div
      className={cn(
        "flex flex-col-reverse items-center justify-between gap-3 border-t border-border pt-3 sm:flex-row",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {!hidePageSize && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                // Keep the first visible row roughly stable when the size changes,
                // so the user doesn't lose their place jumping to a bigger page.
                const nextSize = Number(v);
                const firstRow = current * pageSize;
                onPageSizeChange(nextSize);
                onPageChange(Math.floor(firstRow / nextSize));
              }}
            >
              <SelectTrigger className="h-8 w-[74px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <p className="text-xs text-muted-foreground tabular-nums">
          {total === 0 ? `No ${plural}` : `${first}–${last} of ${total} ${plural}`}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={current === 0}
          onClick={() => onPageChange(0)}
          aria-label="First page"
          title="First page"
        >
          <ChevronsLeft size={14} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={current === 0}
          onClick={() => onPageChange(current - 1)}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={14} />
        </Button>
        <span className="min-w-[72px] text-center text-xs font-medium tabular-nums">
          Page {current + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={current >= totalPages - 1}
          onClick={() => onPageChange(current + 1)}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={14} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={current >= totalPages - 1}
          onClick={() => onPageChange(totalPages - 1)}
          aria-label="Last page"
          title="Last page"
        >
          <ChevronsRight size={14} />
        </Button>
      </div>
    </div>
  );
}

/** Slice an in-memory array for the current page. */
export function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  return rows.slice(start, start + pageSize);
}

/**
 * State + helpers for a paginated list. Keeps page and pageSize together and
 * resets to page 0 whenever `resetKey` changes — that's the bug hand-rolled
 * pagination almost always has: you filter while on page 5 and see an empty
 * table because the filtered set only has 2 pages.
 *
 * Pass a `resetKey` built from every filter/search value the list uses.
 */
export function usePagination(resetKey?: unknown, initialSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialSize);

  useEffect(() => { setPage(0); }, [resetKey]);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    /** Range for a Supabase `.range(from, to)` server-side query. */
    range: [page * pageSize, page * pageSize + pageSize - 1] as const,
    /** Slice for client-side lists already fully in memory. */
    slice: <T,>(rows: T[]) => paginate(rows, page, pageSize),
    /** Props spread for <Pagination {...bind(total)} />. */
    bind: (total: number, itemLabel?: string) => ({
      page,
      pageSize,
      total,
      onPageChange: setPage,
      onPageSizeChange: setPageSize,
      itemLabel,
    }),
  };
}
