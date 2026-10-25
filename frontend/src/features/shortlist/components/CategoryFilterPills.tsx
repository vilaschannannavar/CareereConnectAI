import React from "react";
import { Badge } from "@/components/ui/badge";

interface CategoryFilterPillsProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedPriority: string;
  onSelectPriority: (priority: string) => void;
}

export function CategoryFilterPills({
  selectedCategory,
  onSelectCategory,
  selectedPriority,
  onSelectPriority,
}: CategoryFilterPillsProps) {
  const categories = [
    { id: "all", label: "All Categories" },
    { id: "A", label: "[A] Recruiter / HR" },
    { id: "B", label: "[B] Tech Professional" },
    { id: "C", label: "[C] Eng Leadership" },
    { id: "D", label: "[D] Potential Referrer" },
    { id: "E", label: "[E] Low Relevance" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground font-semibold mr-1">Categories:</span>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-semibold">Priority:</span>
        <select
          value={selectedPriority}
          onChange={(e) => onSelectPriority(e.target.value)}
          className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Priorities</option>
          <option value="High">High (&ge;70)</option>
          <option value="Medium">Medium (40-69)</option>
          <option value="Low">Low (&lt;40)</option>
          <option value="Insufficient Information">Insufficient Info</option>
        </select>
      </div>
    </div>
  );
}
