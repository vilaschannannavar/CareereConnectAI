import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, ArrowUpDown } from "lucide-react";

interface ConnectionFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  companyFilter: string;
  onCompanyChange: (val: string) => void;
  roleFilter: string;
  onRoleChange: (val: string) => void;
  sortBy: "name" | "company" | "connected_on";
  onSortByChange: (val: "name" | "company" | "connected_on") => void;
  sortOrder: "asc" | "desc";
  onToggleSortOrder: () => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function ConnectionFilters({
  search,
  onSearchChange,
  companyFilter,
  onCompanyChange,
  roleFilter,
  onRoleChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
  onApplyFilters,
  onResetFilters,
  hasActiveFilters,
}: ConnectionFiltersProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, company, role..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApplyFilters()}
            className="pl-9 text-sm"
          />
        </div>

        <div>
          <Input
            placeholder="Filter by company..."
            value={companyFilter}
            onChange={(e) => onCompanyChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApplyFilters()}
            className="text-sm"
          />
        </div>

        <div>
          <Input
            placeholder="Filter by role / position..."
            value={roleFilter}
            onChange={(e) => onRoleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApplyFilters()}
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5" /> Sort:
          </span>
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              onClick={() => onSortByChange("name")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                sortBy === "name"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Name
            </button>
            <button
              onClick={() => onSortByChange("company")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                sortBy === "company"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Company
            </button>
            <button
              onClick={() => onSortByChange("connected_on")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                sortBy === "connected_on"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Connected Date
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSortOrder}
            className="h-7 px-2 text-xs"
            title={`Sort order: ${sortOrder.toUpperCase()}`}
          >
            {sortOrder === "asc" ? "Ascending ↑" : "Descending ↓"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={onApplyFilters}
            className="h-8 px-4 text-xs font-semibold shadow-xs"
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filter
          </Button>
        </div>
      </div>
    </div>
  );
}
