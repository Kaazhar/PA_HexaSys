interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ page, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="btn-secondary py-1.5 px-3 disabled:opacity-50 text-sm"
      >
        Précédent
      </button>
      <span className="px-3 py-1.5 text-sm text-gray-600">
        Page {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="btn-secondary py-1.5 px-3 disabled:opacity-50 text-sm"
      >
        Suivant
      </button>
    </div>
  );
}
