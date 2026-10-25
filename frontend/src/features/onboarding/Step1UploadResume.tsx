"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Step1Props {
  onNext: (resumeData: any) => void;
}

export function Step1UploadResume({ onNext }: Step1Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const lower = selected.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      toast.error("Please select a valid PDF (.pdf) or Word (.docx) resume.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      toast.error("Resume file size cannot exceed 5 MB.");
      return;
    }
    setFile(selected);
  };

  const handleUploadAndExtract = async () => {
    const targetFile = file || fileInputRef.current?.files?.[0];
    if (!targetFile) {
      toast.error("Please choose a resume file to upload.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", targetFile);

      const resumeItem = await api.post("/resumes", formData);
      setExtractedData(resumeItem.parsed_data || {});
      toast.success("Resume parsed and verified!");
    } catch (err: any) {
      toast.error(err.message || "Failed to parse resume.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Step 1: Upload Your Resume</h2>
        <p className="text-sm text-muted-foreground">
          CareerConnect AI extracts your verified skills and background to anchor every recommendation in truth.
        </p>
      </div>

      <div className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-2xl p-8 text-center bg-card">
        <input
          id="onboarding-resume-input"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.docx"
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-primary/10 text-primary rounded-full">
            <Upload className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {file ? file.name : "Choose a PDF or DOCX resume"}
            </p>
            <p className="text-xs text-muted-foreground">Max 5 MB. Strictly private & encrypted.</p>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Select File
            </Button>
            {file && !extractedData && (
              <Button
                size="sm"
                onClick={handleUploadAndExtract}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Extracting Skills...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Upload & Extract</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {extractedData && (
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Extracted Qualifications
            </span>
            <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Verified In-Memory
            </Badge>
          </div>

          {extractedData.skills?.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-foreground">Top Skills:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {extractedData.skills.slice(0, 8).map((sk: string) => (
                  <Badge key={sk} variant="secondary" className="text-xs">
                    {sk}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-border/50 flex justify-end">
            <Button onClick={() => onNext(extractedData)} className="gap-2">
              Next: Confirm Profile <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
