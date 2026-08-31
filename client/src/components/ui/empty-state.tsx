import React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Standardized Empty State Display Component
 * Provides uniform placeholder rendering when lists/tables are empty.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderOpen,
  title = "No data found",
  description = "There are no records to display at this time.",
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50 my-4 ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700 mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mt-1 mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          size="sm"
          className="bg-teal-700 hover:bg-teal-800 text-white font-medium cursor-pointer"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
