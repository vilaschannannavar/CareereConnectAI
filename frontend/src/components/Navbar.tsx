"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCapabilities } from "@/context/CapabilityContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ShieldCheck, LogOut, User as UserIcon } from "lucide-react";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { capabilities } = useCapabilities();

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              CareerConnect <span className="text-blue-600">AI</span>
            </span>
          </Link>
          <Badge variant="success" className="hidden sm:inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Zero-Scraping Compliant
          </Badge>
        </div>

        <nav className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md py-1.5 px-3">
                <UserIcon className="h-4 w-4 text-slate-500" />
                <span className="font-medium">{user?.full_name || user?.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
