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
  UserCircle,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

const phases = [
  {
    name: "Discover",
    pages: [
      { name: "Discovery Engine", icon: Sparkles, page: "DailySuggestions" },
      { name: "Target Companies", icon: Building2, page: "Companies" },
      { name: "Auto-Monitoring", icon: Rss, page: "JobBoards" },
    ]
  },
  {
    name: "Qualify",
    pages: [
      { name: "Qualified Opportunities", icon: Users, page: "OpenRoles" },
    ]
  },
  {
    name: "Pursue",
    pages: [
      { name: "Application Tracker", icon: Kanban, page: "JobsPipeline" },
      { name: "Outreach", icon: Send, page: "Outreach" },
    ]
  },
  {
    name: "Analyze",
    pages: [
      { name: "Analytics", icon: BarChart3, page: "Analytics" },
    ]
  }
];

const utilityPages = [
  { name: "Command Center", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Settings", icon: Settings, page: "Settings" },
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePhase, setActivePhase] = useState(null);

  // Determine current phase based on active page
  const getCurrentPhase = () => {
    for (const phase of phases) {
      if (phase.pages.some(p => p.page === currentPageName)) {
        return phase.name;
      }
    }
    return null;
  };

  const currentPhase = getCurrentPhase();

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

              {/* Desktop Nav - Phase Based */}
              <div className="hidden lg:flex items-center gap-6">
                {phases.map((phase) => {
                  const isPhaseActive = phase.name === currentPhase;
                  const hasHover = activePhase === phase.name;

                  return (
                    <div 
                      key={phase.name}
                      className="relative"
                      onMouseEnter={() => setActivePhase(phase.name)}
                      onMouseLeave={() => setActivePhase(null)}
                    >
                      <div className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-default ${
                        isPhaseActive ? "text-[#F7931E] bg-[#FEF3E2]" : "text-gray-600 hover:text-gray-900"
                      }`}>
                        {phase.name}
                      </div>

                      {/* Dropdown on hover */}
                      {(hasHover || isPhaseActive) && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] z-50">
                          {phase.pages.map((page) => {
                            const isPageActive = currentPageName === page.page;
                            return (
                              <Link
                                key={page.page}
                                to={createPageUrl(page.page)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                                  isPageActive
                                    ? "text-[#F7931E] bg-[#FEF3E2] font-medium"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <page.icon className="w-4 h-4" />
                                {page.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right side - Utility Navigation */}
              <div className="flex items-center gap-1">
                {utilityPages.map((item) => {
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
                      <span className="hidden xl:inline">{item.name}</span>
                    </Link>
                  );
                })}
                <Link
                  to={createPageUrl("CandidateSetup")}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
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
              <div className="px-4 py-3 space-y-4">
                {/* Utility Pages First */}
                <div className="space-y-1">
                  {utilityPages.map((item) => {
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
                </div>
                
                {/* Phase Navigation */}
                {phases.map((phase) => (
                  <div key={phase.name} className="space-y-1">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {phase.name}
                    </div>
                    {phase.pages.map((page) => {
                      const isActive = currentPageName === page.page;
                      return (
                        <Link
                          key={page.page}
                          to={createPageUrl(page.page)}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? "text-[#F7931E] bg-[#FEF3E2]"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <page.icon className="w-4 h-4" />
                          {page.name}
                        </Link>
                      );
                    })}
                  </div>
                ))}
                
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