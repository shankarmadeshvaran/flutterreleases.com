import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const btnBase =
    "w-8 h-8 flex items-center justify-center rounded text-sm transition-colors duration-150 border";

  return (
    <div className="flex items-center justify-center gap-1 py-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className={`${btnBase}`}
        style={{
          borderColor: "var(--border)",
          color: page === 1 ? "var(--text-muted)" : "var(--text-secondary)",
          backgroundColor: "transparent",
          cursor: page === 1 ? "not-allowed" : "pointer",
        }}
      >
        <ChevronLeft size={14} />
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="w-8 h-8 flex items-center justify-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`${btnBase}`}
            style={
              p === page
                ? {
                    borderColor: "var(--accent)",
                    backgroundColor: "var(--accent)",
                    color: "#fff",
                    cursor: "default",
                  }
                : {
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }
            }
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className={`${btnBase}`}
        style={{
          borderColor: "var(--border)",
          color: page === totalPages ? "var(--text-muted)" : "var(--text-secondary)",
          backgroundColor: "transparent",
          cursor: page === totalPages ? "not-allowed" : "pointer",
        }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
