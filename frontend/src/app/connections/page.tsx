"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  Briefcase,
  Building,
  CheckCircle2,
  X,
  Upload,
  ArrowUpDown,
  Filter,
  Calendar,
  Mail,
  Sparkles,
} from "lucide-react";


interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  profile_url: string;
  email?: string | null;
  company: string;
  position: string;
  connected_on?: string | null;
}

interface CSVPreviewData {
  preamble_lines_stripped: number;
  headers: string[];
  preview: Record<string, string>[];
  total_rows: number;
  mapping_suggestions: Record<string, string>;
}

export default function ConnectionsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "company" | "connected_on">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CSVPreviewData | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append("query", search.trim());
      if (companyFilter.trim()) params.append("company", companyFilter.trim());
      if (roleFilter.trim()) params.append("role", roleFilter.trim());
      params.append("sort_by", sortBy);
      params.append("sort_order", sortOrder);

      const endpoint = `/contacts?${params.toString()}`;
      const res = await apiClient<{ items: Contact[]; total: number }>(endpoint);
      setContacts(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load connections.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContacts();
  };

  const handleResetFilters = () => {
    setSearch("");
    setCompanyFilter("");
    setRoleFilter("");
    setSortBy("name");
    setSortOrder("asc");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportError(null);
    setPreviewData(null);
    if (!file) return;

    const isCsvOrZip = file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".zip");
    if (!isCsvOrZip) {
      setImportError("Please select a valid LinkedIn export (.csv or .zip).");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setImportError("File cannot exceed 25 MB.");
      return;
    }

    setSelectedCsvFile(file);

    // Automatically trigger preview
    try {
      setIsPreviewing(true);
      const formData = new FormData();
      formData.append("file", file);

      const preview = await apiClient<CSVPreviewData>("/contacts/preview-csv", {
        method: "POST",
        data: formData,
      });
      setPreviewData(preview);
    } catch (err: any) {
      setImportError(err.message || "Failed to preview CSV file.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedCsvFile) return;

    try {
      setIsImporting(true);
      setImportError(null);

      const formData = new FormData();
      formData.append("file", selectedCsvFile);

      const result = await apiClient<{ total: number; added: number; updated: number }>("/contacts/import-csv", {
        method: "POST",
        data: formData,
      });

      setImportStatusMessage(
        `Import complete: ${result.added} new connection(s) added, ${result.updated} existing record(s) updated.`
      );
      setSelectedCsvFile(null);
      setPreviewData(null);
      setIsImportModalOpen(false);

      await fetchContacts();
      setTimeout(() => setImportStatusMessage(null), 6000);
    } catch (err: any) {
      setImportError(err.message || "Failed to import connections CSV.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Connections Directory</h1>
          <p className="text-sm text-slate-500">
            {total} 1st-degree connection{total === 1 ? "" : "s"} imported from official LinkedIn archive.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/shortlist">
            <Button variant="outline" size="sm">
              <Sparkles className="mr-1.5 h-4 w-4" />
              Scoring &amp; Shortlists
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setImportError(null);
              setSelectedCsvFile(null);
              setPreviewData(null);
              setIsImportModalOpen(true);
            }}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Import Connections.csv
          </Button>
        </div>
      </div>

      {importStatusMessage && (
        <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{importStatusMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Input
                placeholder="Search name, company, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>

            <div>
              <Input
                placeholder="Filter by company..."
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              />
            </div>

            <div>
              <Input
                placeholder="Filter by role / position..."
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" variant="secondary" className="flex-1">
                Filter
              </Button>
              {(search || companyFilter || roleFilter) && (
                <Button type="button" variant="outline" onClick={handleResetFilters}>
                  Clear
                </Button>
              )}
            </div>
          </form>

          {/* Sorting controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <span>Sort by:</span>
              <button
                type="button"
                onClick={() => {
                  if (sortBy === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else {
                    setSortBy("name");
                    setSortOrder("asc");
                  }
                }}
                className={`px-2 py-0.5 rounded font-medium ${
                  sortBy === "name" ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                Name {sortBy === "name" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortBy === "company") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else {
                    setSortBy("company");
                    setSortOrder("asc");
                  }
                }}
                className={`px-2 py-0.5 rounded font-medium ${
                  sortBy === "company" ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                Company {sortBy === "company" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortBy === "connected_on") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else {
                    setSortBy("connected_on");
                    setSortOrder("asc");
                  }
                }}
                className={`px-2 py-0.5 rounded font-medium ${
                  sortBy === "connected_on" ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                Connected Date {sortBy === "connected_on" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </button>
            </div>
            <span>Showing {contacts.length} of {total}</span>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Contacts List or Real Empty States */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : contacts.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 bg-white p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              {search || companyFilter || roleFilter ? "No matching connections found" : "No connections imported yet"}
            </h3>
            <p className="text-sm text-slate-500">
              {search || companyFilter || roleFilter
                ? "No connections match your filters. Try clearing your search parameters."
                : "Export your Connections.csv from LinkedIn Settings > Data Privacy and import it here to get started."}
            </p>
            {search || companyFilter || roleFilter ? (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIsImportModalOpen(true)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Upload Connections.csv
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id} className="hover:border-slate-300 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {contact.first_name} {contact.last_name || ""}
                    </h4>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                      <Briefcase className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{contact.position || "Unknown"}</span>
                    </p>
                  </div>
                  {contact.profile_url && (
                    <a
                      href={contact.profile_url.startsWith("http") ? contact.profile_url : `https://${contact.profile_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                      title="Open LinkedIn Profile"
                      aria-label="Open LinkedIn Profile in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate max-w-[150px]">{contact.company || "Unknown"}</span>
                    </span>
                    {contact.connected_on ? (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {contact.connected_on}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Date Unknown</span>
                    )}
                  </div>

                  {contact.email && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                      <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">Import Connections CSV</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {importError && (
                <div className="rounded-lg bg-red-50 p-3 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center space-y-3 bg-slate-50">
                <Upload className="mx-auto h-8 w-8 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Select your Connections.csv or LinkedIn export .zip file</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload either the raw <code className="font-semibold text-slate-700">.zip</code> archive or extracted <code className="font-semibold text-slate-700">Connections.csv</code>.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.zip,application/zip,application/x-zip-compressed,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-file-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
                {selectedCsvFile && (
                  <p className="text-xs font-semibold text-blue-600">Selected: {selectedCsvFile.name}</p>
                )}
              </div>

              {isPreviewing && (
                <div className="flex items-center justify-center py-6 gap-2 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span>Analyzing CSV structure and stripping preamble notes...</span>
                </div>
              )}

              {/* Preview and Validation Report */}
              {previewData && (
                <div className="space-y-4 pt-2">
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      Validation Summary
                    </p>
                    <p>• {previewData.total_rows} connection row(s) detected.</p>
                    {previewData.preamble_lines_stripped > 0 ? (
                      <p>• Cleanly stripped {previewData.preamble_lines_stripped} preamble instructional note lines.</p>
                    ) : (
                      <p>• Standard CSV header detected at line 1.</p>
                    )}
                    <p>• Duplicate detection active: Re-importing updates existing contacts instead of creating duplicates.</p>
                  </div>

                  {/* Column Mapping Preview */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Detected Column Mapping
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(previewData.mapping_suggestions).map(([csvCol, targetField]) => (
                        <div key={csvCol} className="p-2 rounded bg-slate-100 border border-slate-200 flex justify-between">
                          <span className="text-slate-600 truncate">{csvCol}</span>
                          <span className="font-semibold text-blue-700">→ {targetField}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sample rows */}
                  {previewData.preview.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Sample Data (First {previewData.preview.length} rows)
                      </h4>
                      <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                              {previewData.headers.slice(0, 5).map((h) => (
                                <th key={h} className="p-2 font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.preview.slice(0, 3).map((row, idx) => (
                              <tr key={idx} className="border-b border-slate-100 last:border-0">
                                {previewData.headers.slice(0, 5).map((h) => (
                                  <td key={h} className="p-2 text-slate-700 truncate max-w-[120px]">
                                    {row[h] || <span className="text-slate-400 italic">Unknown</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedCsvFile || !previewData || isImporting}
                onClick={handleImportSubmit}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingesting Connections...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Confirm &amp; Import ({previewData?.total_rows || 0} Contacts)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
