import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface PageHeaderProps {
  title: string;
  description?: string;
  showBack?: boolean;
  backUrl?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Standard Page Header Component
 * Provides uniform page headers, title hierarchy, optional back navigation, and action slots.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  showBack = false,
  backUrl = "/",
  actions,
  children,
}) => {
  const [, setLocation] = useLocation();

  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4 border-gray-200">
      <div className="flex items-center gap-3">
        {showBack && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation(backUrl)}
            className="h-9 w-9 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#061941]">{title}</h1>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
      {children}
    </div>
  );
};
