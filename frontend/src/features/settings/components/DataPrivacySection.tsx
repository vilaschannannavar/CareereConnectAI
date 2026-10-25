"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Shield, Download, Trash2, AlertTriangle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function DataPrivacySection() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/v1/auth/export-data", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Data export failed.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `careerconnect-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("All personal data exported cleanly as JSON.");
    } catch {
      toast.error("Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePurgeContacts = async () => {
    if (!confirm("Are you sure? This will permanently delete all imported connections, message drafts, and outreach logs.")) {
      return;
    }
    setIsPurging(true);
    try {
      const res = await fetch("/api/v1/contacts/purge", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Purge failed.");
      toast.success("All contacts and conversation history have been permanently purged.");
      window.location.reload();
    } catch {
      toast.error("Failed to purge contacts.");
    } finally {
      setIsPurging(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm.");
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch("/api/v1/auth/delete-account", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Account deletion failed.");
      toast.success("Your account and all associated data have been permanently erased.");
      await logout();
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Privacy, GDPR & Data Rights
        </CardTitle>
        <CardDescription>
          You have complete sovereignty over your data. Export everything or purge all records at any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-muted/30 rounded-lg border border-border gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Export All Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download your complete personal archive (profile, contacts, resume text, drafts, logs).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            disabled={isExporting}
            className="h-8 text-xs gap-1.5 shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Download JSON"}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-muted/30 rounded-lg border border-border gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Purge All Contacts & Drafts</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instantly wipes all connection data and messages without deleting your profile or account.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePurgeContacts}
            disabled={isPurging}
            className="h-8 text-xs gap-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-700 shrink-0 border-amber-500/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isPurging ? "Purging..." : "Purge Contacts"}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-destructive/5 rounded-lg border border-destructive/20 gap-3">
          <div>
            <p className="text-sm font-semibold text-destructive">Permanently Delete Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Irreversible action. Erases your login, resumes, connections, and audit trails under GDPR Article 17.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="h-8 text-xs gap-1.5 shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Account
          </Button>
        </div>
      </CardContent>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete Account Permanently
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All candidate profiles, uploaded files, and outreach records will be destroyed immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-foreground font-medium">
              To proceed, please type <strong className="text-destructive font-mono">DELETE</strong> below:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={confirmText !== "DELETE" || isDeleting}
            >
              {isDeleting ? "Erasing Data..." : "Confirm Permanent Deletion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
