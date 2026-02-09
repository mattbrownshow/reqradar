import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Menu, X, UserCircle, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const phaseMap = {
    "Discover": 'discover',
    "DiscoverySources": 'discover',
    "ActiveOpportunities": 'manage',
    "Manage": 'manage',
    "OutreachInbox": 'outreach',
    "Analytics": 'analyze'
  };

  const currentPhase = phaseMap[currentPageName];

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <style>{`
        :root {
          --flowzyn-orange: #FF9E4D;
          --flowzyn-orange-light: #FFF9F5;
          --flowzyn-orange-dark: #E8893D;
          --discover-blue: #4A90E2;
          --qualify-orange: #FF9E4D;
          --pursue-green: #50C878;
          --analyze-purple: #9B59B6;
          --background: #FAFAF9;
          --card-bg: #FFFFFF;
          --border: #E5E5E5;
          --text-primary: #1A1A1A;
          --text-secondary: #6B7280;
          --text-muted: #9CA3AF;
        }

        .workflow-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .phase-group {
          padding: 8px 16px;
          border-radius: 8px;
          transition: background 0.2s;
          cursor: pointer;
          text-decoration: none;
          display: block;
        }

        .phase-group:hover { background: rgba(0,0,0,0.05); }
        .phase-group[data-phase="discover"]:hover { background: rgba(74, 144, 226, 0.1); }
        .phase-group[data-phase="qualify"]:hover { background: rgba(255, 158, 77, 0.1); }
        .phase-group[data-phase="pursue"]:hover { background: rgba(80, 200, 120, 0.1); }
        .phase-group[data-phase="analyze"]:hover { background: rgba(155, 89, 182, 0.1); }

        .phase-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          text-align: center;
        }

        .phase-separator {
          color: var(--text-muted);
          font-size: 12px;
        }

        .phase-group.active .phase-label {
          color: var(--text-primary);
          font-weight: 700;
        }

        .phase-group[data-phase="discover"].active { background: rgba(74, 144, 226, 0.15); }
        .phase-group[data-phase="qualify"].active { background: rgba(255, 158, 77, 0.15); }
        .phase-group[data-phase="pursue"].active { background: rgba(80, 200, 120, 0.15); }
        .phase-group[data-phase="analyze"].active { background: rgba(155, 89, 182, 0.15); }
      `}</style>

      {/* Top Navigation */}
      {currentPageName !== "CandidateSetup" && (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 shrink-0">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69874d93ef5c22ad8b35ad6f/1b28eb63c_Screenshot2026-02-08at85127AM.png" alt="ReqRadar" className="h-8" />
              </Link>

              {/* Desktop Workflow Nav */}
              <div className="hidden lg:flex workflow-nav">
                {/* Discover Phase */}
                <Link to={createPageUrl("Discover")} className={`phase-group ${currentPhase === 'discover' ? 'active' : ''}`} data-phase="discover">
                  <div className="phase-label">Discover</div>
                </Link>

                <div className="phase-separator">→</div>

                {/* Manage Phase */}
                <Link to={createPageUrl("Manage")} className={`phase-group ${currentPhase === 'manage' ? 'active' : ''}`} data-phase="manage">
                  <div className="phase-label">Manage</div>
                </Link>
                
                <div className="phase-separator">→</div>
                
                {/* Outreach Phase */}
                <Link to={createPageUrl("OutreachInbox")} className={`phase-group ${currentPhase === 'outreach' ? 'active' : ''}`} data-phase="outreach">
                  <div className="phase-label">Outreach</div>
                </Link>

                <div className="phase-separator">→</div>

                {/* Analyze Phase */}
                <Link to={createPageUrl("Analytics")} className={`phase-group ${currentPhase === 'analyze' ? 'active' : ''}`} data-phase="analyze">
                  <div className="phase-label">Analyze</div>
                </Link>
              </div>

              {/* Right side */}
              <div className="hidden lg:flex items-center gap-2">
                <Link to={createPageUrl("Dashboard")} className={`px-3 py-2 rounded-lg text-sm ${currentPageName === "Dashboard" ? "text-gray-900 font-semibold" : "text-gray-600 hover:text-gray-900"}`}>
                  Dashboard
                </Link>
                <Link to={createPageUrl("Settings")} className={`px-3 py-2 rounded-lg text-sm ${currentPageName === "Settings" ? "text-gray-900 font-semibold" : "text-gray-600 hover:text-gray-900"}`}>
                  Settings
                </Link>
                <button onClick={async () => await base44.auth.logout()} title={user?.email || ''} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-900 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-100 bg-white">
              <div className="px-4 py-3 space-y-1">
                <Link to={createPageUrl("Dashboard")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Dashboard</Link>
                <Link to={createPageUrl("Discover")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Discover</Link>
                <Link to={createPageUrl("Manage")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Manage</Link>
                <Link to={createPageUrl("OutreachInbox")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Outreach</Link>
                <Link to={createPageUrl("Analytics")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Analytics</Link>
                <Link to={createPageUrl("Settings")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Settings</Link>
                <button onClick={async () => await base44.auth.logout()} title={user?.email || ''} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer w-full text-left">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
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