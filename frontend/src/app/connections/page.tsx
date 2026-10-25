"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionCard } from "@/features/connections/components/ConnectionCard";
import { ConnectionFilters } from "@/features/connections/components/ConnectionFilters";
import { CsvImportModal } from "@/features/connections/components/CsvImportModal";
import { BulkActionsBar } from "@/features/connections/components/BulkActionsBar";
import { useConnections, ConnectionsQueryParams } from "@/features/connections/hooks/useConnections";
import { Users, FileSpreadsheet, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function ConnectionsPage() {
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "company" | "connected_on">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);

  // Active query parameters
  const [activeParams, setActiveParams] = useState<ConnectionsQueryParams>({
    query: "",
    company: "",
    role: "",
    sort_by: "name",
    sort_order: "asc",
  });

  const { data, isLoading, error, refetch } = useConnections(activeParams);

  const handleApplyFilters = () => {
    setActiveParams({
      query: search,
      company: companyFilter,
      role: roleFilter,
      sort_by: sortBy,
      sort_order: sortOrder,
    });
  };

  const handleResetFilters = () => {
    setSearch("");
    setCompanyFilter("");
    setRoleFilter("");
    setSortBy("name");
    setSortOrder("asc");
    setActiveParams({
      query: "",
      company: "",
      role: "",
      sort_by: "name",
      sort_order: "asc",
    });
  };

  const handleToggleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBatchAnalyze = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsBatchAnalyzing(true);
      await api.post("/scoring/batch-analyze", {
        contact_ids: Array.from(selectedIds),
      });
      toast.success(`Successfully analyzed ${selectedIds.size} connection(s)!`);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message || "Failed to batch score contacts.");
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  const contacts = data?.items || [];
  const total = data?.total || 0;
  const hasActiveFilters = Boolean(
    activeParams.query || activeParams.company || activeParams.role
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connections Directory"
        description={`${total} 1st-degree connection${total === 1 ? "" : "s"} imported from official LinkedIn archive.`}
        badge={
          <Badge variant="default" className="text-xs">
            {total} Total
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button asChild variant="outline" size="sm">
              <Link href="/shortlist" className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Scoring & Shortlists</span>
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 font-semibold shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Import Connections.csv</span>
            </Button>
          </div>
        }
      />

      <ConnectionFilters
        search={search}
        onSearchChange={setSearch}
        companyFilter={companyFilter}
        onCompanyChange={setCompanyFilter}
        roleFilter={roleFilter}
        onRoleChange={setRoleFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onToggleSortOrder={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error.message || "Failed to load connections."}</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-4 w-52 rounded" />
              <div className="pt-2 border-t border-border/40 flex justify-between">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No connections found"
          description={
            hasActiveFilters
              ? "No contacts match your active filter criteria. Try clearing search filters."
              : "You haven't imported any LinkedIn connections yet. Export your official Connections.csv archive to get started."
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIsImportModalOpen(true)}>
                Import Connections.csv
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {contacts.map((contact) => (
            <ConnectionCard
              key={contact.id}
              contact={contact}
              isSelected={selectedIds.has(contact.id)}
              onSelectChange={(sel) => handleToggleSelect(contact.id, sel)}
            />
          ))}
        </div>
      )}

      <CsvImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={() => refetch()}
      />

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBatchAnalyze={handleBatchAnalyze}
        isAnalyzing={isBatchAnalyzing}
      />
    </div>
  );
}
