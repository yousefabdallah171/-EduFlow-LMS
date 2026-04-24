import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const Pagination = ({ currentPage, totalPages, onPageChange, isLoading = false }: PaginationProps) => {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between gap-4 border-t px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Page <span style={{ color: "var(--color-text-primary)" }} className="font-semibold">{currentPage}</span> of{" "}
        <span style={{ color: "var(--color-text-primary)" }} className="font-semibold">{totalPages}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border p-2 transition-colors disabled:opacity-50 hover:bg-surface2 disabled:hover:bg-transparent"
          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
          disabled={!canGoPrevious || isLoading}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          className="rounded-lg border p-2 transition-colors disabled:opacity-50 hover:bg-surface2 disabled:hover:bg-transparent"
          style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
          disabled={!canGoNext || isLoading}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
