import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Standardized Data Table Pagination Footer Component
 * Renders uniform pagination metadata, previous/next controls, and page number buttons.
 */
export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  currentPage,
  totalPages,
  totalEntries,
  pageSize,
  onPageChange,
  className = "",
}) => {
  if (totalEntries === 0) return null;

  const startEntry = Math.min((currentPage - 1) * pageSize + 1, totalEntries);
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  // Generate page numbers sliding window
  const pageNumbers: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);

    if (currentPage < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 border-t border-gray-200 mt-4 text-xs text-gray-600 ${className}`}>
      <div>
        Showing <span className="font-semibold text-gray-900">{startEntry}</span> to{" "}
        <span className="font-semibold text-gray-900">{endEntry}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalEntries}</span> entries
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-8 px-2 text-xs cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
        </Button>

        <div className="flex items-center gap-1 px-1">
          {pageNumbers.map((num, idx) =>
            typeof num === "number" ? (
              <Button
                key={idx}
                variant={currentPage === num ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(num)}
                className={`h-8 w-8 p-0 text-xs font-semibold cursor-pointer ${
                  currentPage === num
                    ? "bg-teal-700 hover:bg-teal-800 text-white"
                    : "text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {num}
              </Button>
            ) : (
              <span key={idx} className="px-1 text-gray-400">
                ...
              </span>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-8 px-2 text-xs cursor-pointer"
        >
          Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
};
