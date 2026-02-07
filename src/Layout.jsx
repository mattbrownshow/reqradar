import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Menu, X, UserCircle } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const phaseMap = {
    "Discover": 'discover',
    "DiscoverySources": 'discover',
    "ActiveOpportunities": 'qualify',
    "JobsPipeline": 'pursue',
    "Outreach": 'pursue',
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
          position: relative;
          padding: 8px 16px;
          border-radius: 8px;
          transition: background 0.2s;
          cursor: pointer;
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
          margin-bottom: 4px;
          text-align: center;
        }

        .phase-links {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          position: absolute;
          top: 100%;
          left: 0;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          min-width: 200px;
          z-index: 1000;
          margin-top: 4px;
          transition: opacity 0.15s ease-in-out, visibility 0.15s ease-in-out;
        }

        .phase-group:hover .phase-links { 
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transition-delay: 0.1s;
        }

        .phase-links a {
          display: block;
          padding: 8px 12px;
          color: var(--text-primary);
          text-decoration: none;
          border-radius: 4px;
          font-size: 14px;
        }

        .phase-links a:hover { background: #F3F4F6; }

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
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-1 shrink-0">
                <span className="text-2xl font-bold tracking-tight" style={{ color: "#FF9E4D" }}>
                  Flowzyn
                </span>
              </Link>

              {/* Desktop Workflow Nav */}
              <div className="hidden lg:flex workflow-nav">
                {/* Discover Phase */}
                <div className={`phase-group ${currentPhase === 'discover' ? 'active' : ''}`} data-phase="discover">
                  <div className="phase-label">Discover</div>
                  <div className="phase-links">
                    <Link to={createPageUrl("Discover")}>Discovery Engine</Link>
                  </div>
                </div>

                <div className="phase-separator">→</div>

                {/* Qualify Phase */}
                <div className={`phase-group ${currentPhase === 'qualify' ? 'active' : ''}`} data-phase="qualify">
                  <div className="phase-label">Qualify</div>
                  <div className="phase-links">
                    <Link to={createPageUrl("ActiveOpportunities")}>Active Opportunities</Link>
                  </div>
                </div>
                
                <div className="phase-separator">→</div>
                
                {/* Pursue Phase */}
                <div className={`phase-group ${currentPhase === 'pursue' ? 'active' : ''}`} data-phase="pursue">
                  <div className="phase-label">Pursue</div>
                  <div className="phase-links">
                    <Link to={createPageUrl("JobsPipeline")}>Pipeline</Link>
                    <Link to={createPageUrl("Outreach")}>Outreach</Link>
                  </div>
                </div>
                
                <div className="phase-separator">→</div>
                
                {/* Analyze Phase */}
                <div className={`phase-group ${currentPhase === 'analyze' ? 'active' : ''}`} data-phase="analyze">
                  <div className="phase-label">Analyze</div>
                  <div className="phase-links">
                    <Link to={createPageUrl("Analytics")}>Analytics</Link>
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="hidden lg:flex items-center gap-2">
                <Link to={createPageUrl("Dashboard")} className={`px-3 py-2 rounded-lg text-sm ${currentPageName === "Dashboard" ? "text-gray-900 font-semibold" : "text-gray-600 hover:text-gray-900"}`}>
                  Dashboard
                </Link>
                <Link to={createPageUrl("Settings")} className={`px-3 py-2 rounded-lg text-sm ${currentPageName === "Settings" ? "text-gray-900 font-semibold" : "text-gray-600 hover:text-gray-900"}`}>
                  Settings
                </Link>
                <Link to={createPageUrl("CandidateSetup")} className={`px-3 py-2 rounded-lg text-sm ${currentPageName === "CandidateSetup" ? "text-gray-900 font-semibold" : "text-gray-600 hover:text-gray-900"}`}>
                  Profile
                </Link>
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
                <Link to={createPageUrl("ActiveOpportunities")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Active Opportunities</Link>
                <Link to={createPageUrl("JobsPipeline")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Pipeline</Link>
                <Link to={createPageUrl("Outreach")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Outreach</Link>
                <Link to={createPageUrl("Analytics")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Analytics</Link>
                <Link to={createPageUrl("Settings")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Settings</Link>
                <Link to={createPageUrl("CandidateSetup")} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Profile</Link>
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