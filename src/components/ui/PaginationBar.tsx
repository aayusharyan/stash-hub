"use client";

// Stateless pagination row composed from shadcn Pagination primitives.
// Accepts the current page, total pages, and a change handler - callers
// never need to know about the internal shadcn component API.
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export function PaginationBar({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  // Intercepts the anchor click so navigation is handled by onPageChange
  // rather than a real href, keeping URL updates in the caller's control.
  const handleClick = (e: React.MouseEvent, p: number) => {
    e.preventDefault();
    onPageChange(p);
  };

  return (
    <Pagination className="py-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => page > 1 && handleClick(e, page - 1)}
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-30" : ""}
            text=""
          />
        </PaginationItem>

        {pages.map((p, i) =>
          p === "..." ? (
            <PaginationItem key={`dots-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === page}
                onClick={(e) => handleClick(e, p as number)}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => page < totalPages && handleClick(e, page + 1)}
            aria-disabled={page >= totalPages}
            className={page >= totalPages ? "pointer-events-none opacity-30" : ""}
            text=""
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

// Builds the list of page numbers (and "..." ellipsis markers) to render.
// On page 1 or the last page, shows a 5-page window anchored to that edge.
// Everywhere else, shows a 7-page window centred on the current page (±3).
// Pages 1 and `total` are always present as anchors; ellipsis fills the gaps.
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);

  let start: number;
  let end: number;

  if (current === 1) {
    start = 1;
    end = Math.min(5, total);
  } else if (current === total) {
    start = Math.max(1, total - 4);
    end = total;
  } else {
    start = Math.max(1, current - 3);
    end = Math.min(total, current + 3);
  }

  const pages: (number | "...")[] = [];

  // Prepend anchor page 1 and an ellipsis when the window starts beyond page 2
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("...");
  }

  for (let i = start; i <= end; i++) pages.push(i);

  // Append an ellipsis and anchor last page when the window ends before page (total - 1)
  if (end < total) {
    if (end < total - 1) pages.push("...");
    pages.push(total);
  }

  return pages;
}
