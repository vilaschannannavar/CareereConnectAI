"use client";

import React, { useRef, useState } from "react";
import { ResumeItem } from "../hooks/useSettings";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Trash2, Download, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ResumeUploadSectionProps {
  resumes: ResumeItem[];
  onUploadSuccess: () => void;
  onDeleteSuccess: () => void;
}

export function ResumeUploadSection({
  resumes,
  onUploadSuccess,
  onDeleteSuccess,
}: ResumeUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeResume = resumes[0] || null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      toast.error("Only PDF (.pdf) and Word (.docx) files are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(`File is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Max limit is 5 MB.`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    // If user clicked without selecting through custom state, check fileInputRef
    const file = selectedFile || fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Please select a resume file first.");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/resumes", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }

      toast.success("Resume uploaded and parsed successfully!");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploadSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload resume.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resume? Your private file will be permanently removed.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/resumes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Resume deleted.");
      onDeleteSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete resume.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const res = await fetch(`/api/v1/resumes/${id}/download`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Authenticated download failed.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed.");
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Resume Document & Private Storage
        </CardTitle>
        <CardDescription>
          Upload your resume in PDF or DOCX format (max 5 MB). It is parsed in-memory and stored privately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeResume && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-muted/40 rounded-lg border border-border gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{activeResume.file_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{(activeResume.file_size / 1024).toFixed(1)} KB</span>
                  <span>•</span>
                  <span>Uploaded {new Date(activeResume.created_at).toLocaleDateString()}</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Parsed
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(activeResume.id, activeResume.file_name)}
                className="h-8 text-xs gap-1"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(activeResume.id)}
                disabled={isDeleting}
                className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        )}

        <div className="border border-dashed border-border/80 rounded-xl p-6 text-center bg-muted/20">
          <input
            id="resume-file-input"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx"
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {selectedFile ? selectedFile.name : (activeResume ? "Upload a replacement resume" : "Select your PDF or DOCX resume")}
              </p>
              <p className="text-xs text-muted-foreground">Up to 5 MB. Strictly private & encrypted.</p>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={isUploading}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                {isUploading ? "Scanning..." : "Upload & Extract"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
