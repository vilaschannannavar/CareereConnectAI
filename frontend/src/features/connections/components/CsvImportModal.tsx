"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCsvPreview,
  useCsvImport,
  CSVPreviewResponse,
} from "../hooks/useConnections";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export function CsvImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: CsvImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CSVPreviewResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewMutation = useCsvPreview();
  const importMutation = useCsvImport();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorMessage("Please select a valid CSV file (.csv).");
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);

    try {
      const data = await previewMutation.mutateAsync(file);
      setPreviewData(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to parse CSV preview.");
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    try {
      const result = await importMutation.mutateAsync(selectedFile);
      toast.success(
        `Import complete: ${result.new_contacts_count} added, ${result.updated_contacts_count} updated.`
      );
      handleClose();
      onImportComplete?.();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete CSV import.");
      toast.error("CSV import failed. Please check file format.");
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Import LinkedIn Connections</DialogTitle>
              <DialogDescription className="text-xs">
                Upload your official member data archive (`Connections.csv`).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File Picker Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-card hover:bg-accent/40 cursor-pointer transition-colors text-center space-y-2"
          >
            <input
              id="csv-file-input"
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {selectedFile ? selectedFile.name : "Click to select Connections.csv"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                UTF-8 or UTF-8 BOM encoding supported (up to 10 MB)
              </p>
            </div>
          </div>

          {previewMutation.isPending && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Analyzing preamble and validating columns...</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Validation Summary */}
          {previewData && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-success" />
                  Validation Summary
                </span>
                <Badge variant="success">
                  {previewData.total_rows} Contacts Detected
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="rounded-md bg-card p-2 border border-border/50">
                  <span className="block font-medium text-foreground">Preamble Stripped:</span>
                  <span>{previewData.preamble_lines_stripped} note line(s)</span>
                </div>
                <div className="rounded-md bg-card p-2 border border-border/50">
                  <span className="block font-medium text-foreground">Mapped Columns:</span>
                  <span>{previewData.headers?.length || 0} recognized headers</span>
                </div>
              </div>

              {previewData.preview && previewData.preview.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">Sample Extracted Row:</p>
                  <div className="rounded-md bg-card p-2.5 border border-border/60 text-[11px] font-mono text-muted-foreground overflow-x-auto">
                    {previewData.preview[0]["First Name"]} {previewData.preview[0]["Last Name"]} &bull;{" "}
                    {previewData.preview[0]["Company"]} ({previewData.preview[0]["Position"]})
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={importMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmImport}
            disabled={!previewData || importMutation.isPending}
            className="font-semibold"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Confirm & Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
