"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, CheckCircle2, ArrowRight, ArrowLeft, Loader2, ShieldCheck, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Step4Props {
  onNext: (importResult: any) => void;
  onBack: () => void;
}

export function Step4CsvImport({ onNext, onBack }: Step4Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a standard Connections.csv file.");
      return;
    }

    setCsvFile(file);
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await api.post("/contacts/preview-csv", formData);
      setPreview(data);
      toast.success(`Found ${data.total_rows} rows (${data.valid_rows} valid contacts)`);
    } catch (err: any) {
      toast.error(err.message || "Failed to preview CSV.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!csvFile) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const result = await api.post("/contacts/import-csv", formData);
      setImportSummary(result);
      toast.success(`Imported ${result.added || result.total || 0} connections!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to import connections.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Step 4: Import LinkedIn Connections</h2>
        <p className="text-sm text-muted-foreground">
          Import your official LinkedIn data archive. 100% compliant with LinkedIn User Agreement. Zero browser scraping.
        </p>
      </div>

      <div className="bg-muted/40 border border-border p-4 rounded-xl space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <HelpCircle className="h-4 w-4 text-primary" />
          <span>How to download Connections.csv from LinkedIn:</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-1 leading-relaxed">
          <li>Go to LinkedIn <strong>Settings & Privacy</strong> &rarr; <strong>Data Privacy</strong>.</li>
          <li>Click <strong>Get a copy of your data</strong>.</li>
          <li>Select <strong>Want something in particular? &rarr; Connections</strong>.</li>
          <li>Click <strong>Request archive</strong> (ready within ~10 minutes). Unzip and upload here!</li>
        </ol>
      </div>

      <div className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-2xl p-6 text-center bg-card">
        <input
          id="onboarding-csv-input"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-full">
            <FileSpreadsheet className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {csvFile ? csvFile.name : "Select your Connections.csv file"}
            </p>
            <p className="text-xs text-muted-foreground">Standard LinkedIn export headers supported.</p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            Choose CSV File
          </Button>
        </div>
      </div>

      {preview && !importSummary && (
        <div className="bg-card border border-border p-4 rounded-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">CSV Preview</span>
            <span className="text-muted-foreground">
              {preview.valid_rows} of {preview.total_rows} valid records
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto border border-border/60 rounded-lg text-xs">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b border-border/60 sticky top-0">
                <tr>
                  <th className="p-2 font-medium">Name</th>
                  <th className="p-2 font-medium">Company</th>
                  <th className="p-2 font-medium">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {preview.sample_records?.slice(0, 4).map((row: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-2 truncate font-medium">{row.first_name} {row.last_name}</td>
                    <td className="p-2 truncate text-muted-foreground">{row.company}</td>
                    <td className="p-2 truncate text-muted-foreground">{row.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            onClick={handleConfirmImport}
            disabled={isProcessing}
            className="w-full gap-2 mt-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Importing Contacts...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm & Import {preview.valid_rows} Contacts</span>
              </>
            )}
          </Button>
        </div>
      )}

      {importSummary && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3 animate-in fade-in">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <div>
            <p className="text-sm font-bold text-foreground">Import Completed Successfully!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Added {importSummary.added || 0} connections, updated {importSummary.updated || 0}.
            </p>
          </div>
          <Button onClick={() => onNext(importSummary)} className="gap-2 mx-auto">
            Proceed to Batch Analysis <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!importSummary && (
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      )}
    </div>
  );
}
