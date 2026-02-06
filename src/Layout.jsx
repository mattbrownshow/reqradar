import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  Kanban,
  Send,
  Rss,
  BarChart3,
  Settings,
  Menu,
  X,
  Search,
  UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Companies", icon: Building2, page: "Companies" },
  { name: "Open Roles", icon: Users, page: "OpenRoles" },
  { name: "Pipeline", icon: Kanban, page: "Pipeline" },
  { name: "Outreach", icon: Send, page: "Outreach" },
  { name: "Job Boards", icon: Rss, page: "JobBoards" },
  { name: "Analytics", icon: BarChart3, page: "Analytics" },
  { name: "Settings", icon: Settings, page: "Settings" },
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        :root {
          --flowzyn-orange: #F7931E;
          --flowzyn-orange-light: #FEF3E2;
          --flowzyn-orange-dark: #E07A0A;
          --success: #10B981;
          --alert: #EF4444;
          --info: #3B82F6;
          --neutral: #6B7280;
        }
      `}</style>

      {/* Top Navigation */}
      {currentPageName !== "CandidateSetup" && (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-1 shrink-0">
                <span className="text-2xl font-bold tracking-tight" style={{ color: "#F7931E" }}>
                  Flowzyn
                </span>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "text-[#F7931E] bg-[#FEF3E2]"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-3">
                <Link
                  to={createPageUrl("CandidateSetup")}
                  className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <UserCircle className="w-5 h-5" />
                  <span className="hidden md:inline">Profile</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 text-gray-500 hover:text-gray-900 rounded-lg"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-100 bg-white">
              <div className="px-4 py-3 space-y-1">
                {navItems.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "text-[#F7931E] bg-[#FEF3E2]"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
                <Link
                  to={createPageUrl("CandidateSetup")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <UserCircle className="w-4 h-4" />
                  Profile Setup
                </Link>
              </div>
            </div>
          )}
        </nav>
      )}

      {/* Main Content */}
      <main className={currentPageName === "CandidateSetup" ? "" : "max-w-[1440px] mx-auto"}>
        {children}
      </main>
    </div>
  );
}