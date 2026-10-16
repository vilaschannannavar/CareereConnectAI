"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Star,
  Mail,
  Send,
  Boxes,
  Settings,
  Briefcase,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/connections", label: "Connections", icon: Users },
  { href: "/shortlist", label: "Shortlist", icon: Star },
  { href: "/messages", label: "Message Studio", icon: Mail },
  { href: "/tracker", label: "Outreach Tracker", icon: Send },
  { href: "/integrations", label: "Integrations", icon: Boxes },
  { href: "/settings", label: "Settings & Privacy", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sticky top-0 z-30">
        <Link href="/overview" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Briefcase className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">CareerConnect AI</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-slate-200 bg-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Main Navigation"
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <Link href="/overview" className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight block">
                CareerConnect <span className="text-blue-600">AI</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-600 block flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Safe &bull; Zero-Scrape
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-600"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === "/overview" && pathname === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <Link href="/privacy" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Privacy Notice
            </Link>
            <span className="text-[10px] text-slate-400">v0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {user?.full_name || user?.email || "User Account"}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              aria-label="Sign out"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
