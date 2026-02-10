import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, FileText, Handshake, CalendarDays,
  ArrowUpRight, Search, Target, Clock, CheckCircle2,
  Send, MessageSquare, TrendingUp, ChevronRight, MapPin, Users, ChevronDown,
  BarChart3, Briefcase, Loader2, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "../components/shared/MetricCard";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("User");
  const [isReady, setIsReady] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
  });
  
  const { data: profile, isLoading: profileLoading, isFetched: profileFetched } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: async () => {
      const profiles = await base44.entities.CandidateProfile.list();
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 100),
    enabled: isReady && profile?.setup_complete,
  });

  const { data: openRoles = [] } = useQuery({
    queryKey: ["openRoles"],
    queryFn: () => base44.entities.OpenRole.list("-created_date", 100),
    enabled: isReady && profile?.setup_complete,
  });

  const { data: jobPipeline = [] } = useQuery({
    queryKey: ["jobPipeline"],
    queryFn: () => base44.entities.JobPipeline.list("-created_date", 100),
    enabled: isReady && profile?.setup_complete,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => base44.entities.Application.list("-created_date", 100),
    enabled: isReady && profile?.setup_complete,
  });

  const { data: outreach = [] } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => base44.entities.OutreachMessage.list("-created_date", 100),
    enabled: isReady && profile?.setup_complete,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.ActivityLog.list("-created_date", 20),
    enabled: isReady && profile?.setup_complete,
  });

  const { data: rssFeeds = [] } = useQuery({
    queryKey: ["rssFeeds"],
    queryFn: () => base44.entities.RSSFeed.list(),
    enabled: isReady && profile?.setup_complete,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["discoveryRuns"],
    queryFn: () => base44.entities.DiscoveryRun.list("-run_at", 5),
    enabled: isReady && profile?.setup_complete,
  });

  const runDiscoveryMutation = useMutation({
    mutationFn: () => base44.functions.invoke("runDiscovery", {}),
    onMutate: () => {
      setDiscoveryMessage(`Searching ${activeMonitors} data feeds... This may take a few minutes.`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openRoles"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["discoveryRuns"] });
      queryClient.invalidateQueries({ queryKey: ["rssFeeds"] });
      setDiscoveryMessage("✓ Discovery complete!");
      setTimeout(() => setDiscoveryMessage(""), 3000);
    },
    onError: () => {
      setDiscoveryMessage("Discovery failed. Please try again.");
      setTimeout(() => setDiscoveryMessage(""), 3000);
    }
  });

  useEffect(() => {
    // Don't proceed until we have definitive data
    if (userLoading) return;
    
    // No user - redirect to login
    if (!user) {
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
      return;
    }
    
    // User exists but profile data not loaded yet - wait
    if (profileLoading || !profileFetched) return;
    
    // Profile check: redirect to setup if incomplete
    if (!profile || !profile.setup_complete) {
      navigate(createPageUrl("CandidateSetup"), { replace: true });
      return;
    }

    // Only mark as ready if user is authenticated AND profile is complete
    setIsReady(true);
  }, [user, userLoading, profile, profileLoading, profileFetched, navigate]);
  
  useEffect(() => {
    if (user) {
      setUserName(user.full_name?.split(' ')[0] || 'User');
    }
  }, [user]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF9E4D]" />
      </div>
    );
  }



  // Calculate dashboard data
  const totalOpportunities = openRoles.length;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const newToday = openRoles.filter(r => new Date(r.created_date) >= todayStart).length;
  const newThisWeek = openRoles.filter(r => new Date(r.created_date) >= weekStart).length;
  
  // Count unique companies tracked
  const companiesTracked = new Set(openRoles.map(j => j.company_name)).size;
  
  // Pipeline stage counts
  const savedCount = jobPipeline.filter(j => j.stage === 'saved').length;
  const intelCount = jobPipeline.filter(j => j.stage === 'researching').length;
  const outreachCount = jobPipeline.filter(j => ['applied', 'interviewing'].includes(j.stage)).length;
  
  // Decision makers found (contacts)
  const contactsFound = outreach.length;
  
  // Active sources count
  const activeSources = rssFeeds.filter(f => f.status === 'active').length + 3; // +3 for API sources
  
  // Last run time
  const lastRun = runs[0];
  const lastRunTime = lastRun ? format(new Date(lastRun.run_at), "MMM d, h:mm a") : 'Never';

  return (
    <div className="px-4 sm:px-6 py-8 lg:py-12">
      <style>{`
        .dashboard-header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 8px 0;
        }
        
        .dashboard-subtitle {
          font-size: 16px;
          color: #666;
          margin: 0 0 24px 0;
        }
        
        .btn-primary-large {
          background: #FF6B35;
          color: white;
          border: none;
          padding: 16px 32px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary-large:hover {
          background: #E85A2A;
        }
        
        .btn-primary-large:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .dashboard-widgets {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }
        
        .widget {
          background: white;
          border: 1px solid #E5E5E5;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
        }
        
        .widget-primary {
          background: linear-gradient(135deg, #FF6B35 0%, #E85A2A 100%);
          color: white;
          border: none;
        }
        
        .widget-icon {
          font-size: 32px;
          margin-bottom: 16px;
        }
        
        .widget-content h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 16px 0;
        }
        
        .widget-primary h3 {
          color: white;
        }
        
        .widget-stats {
          flex: 1;
          margin-bottom: 20px;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
        }
        
        .stat-number {
          font-size: 36px;
          font-weight: 700;
          line-height: 1;
          color: #1a1a1a;
        }
        
        .widget-primary .stat-number {
          color: white;
        }
        
        .stat-label {
          font-size: 14px;
          color: #666;
        }
        
        .widget-primary .stat-label {
          color: rgba(255, 255, 255, 0.9);
        }
        
        .stat-breakdown {
          display: flex;
          gap: 12px;
          font-size: 14px;
          color: #666;
        }
        
        .widget-primary .stat-breakdown {
          color: rgba(255, 255, 255, 0.9);
        }
        
        .pipeline-breakdown {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }
        
        .pipeline-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        
        .stage-count {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
        }
        
        .stage-label {
          font-size: 12px;
          color: #666;
        }
        
        .status-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .status-badge {
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 500;
          width: fit-content;
        }
        
        .status-active {
          background: #E8F5E9;
          color: #2E7D32;
        }
        
        .status-label,
        .status-text {
          font-size: 14px;
          color: #666;
        }
        
        .widget-action {
          background: transparent;
          border: 2px solid #E5E5E5;
          color: #1a1a1a;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
          text-align: center;
        }
        
        .widget-action:hover {
          border-color: #FF6B35;
          color: #FF6B35;
        }
        
        .widget-primary .widget-action {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
        }
        
        .widget-primary .widget-action:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: white;
        }
        
        .quick-actions {
          background: #F5F5F5;
          border-radius: 12px;
          padding: 24px;
        }
        
        .quick-actions h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 16px 0;
        }
        
        .action-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .action-btn {
          background: white;
          border: 1px solid #E5E5E5;
          color: #1a1a1a;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .action-btn:hover {
          border-color: #FF6B35;
          background: #FFF5F2;
        }
      `}</style>

      {/* Dashboard Header */}
      <div className="dashboard-header mb-10">
        <h1>Good morning, {userName}</h1>
        <p className="dashboard-subtitle">
          {totalOpportunities} opportunities discovered • {companiesTracked} companies tracked
        </p>
        <button 
          onClick={() => runDiscoveryMutation.mutate()} 
          disabled={runDiscoveryMutation.isPending}
          className="btn-primary-large"
        >
          {runDiscoveryMutation.isPending ? (
            <>⏳ Running Discovery...</>
          ) : (
            <>🔍 Find New Opportunities</>
          )}
        </button>
        {discoveryMessage && (
          <p className="text-sm text-gray-600 mt-2 animate-pulse">{discoveryMessage}</p>
        )}
      </div>

      {/* Dashboard Widgets */}
      <div className="dashboard-widgets">
        {/* Widget 1: Discovery Feed */}
        <div className="widget widget-primary">
          <div className="widget-icon">🔍</div>
          <div className="widget-content">
            <h3>Discovery Feed</h3>
            <div className="widget-stats">
              <div className="stat-item">
                <span className="stat-number">{totalOpportunities}</span>
                <span className="stat-label">Total Opportunities</span>
              </div>
              <div className="stat-breakdown">
                <span>{newToday} new today</span>
                <span>{newThisWeek} this week</span>
              </div>
            </div>
            <button onClick={() => navigate(createPageUrl('Discover'))} className="widget-action">
              View All Opportunities →
            </button>
          </div>
        </div>

        {/* Widget 2: Active Pipeline */}
        <div className="widget">
          <div className="widget-icon">📊</div>
          <div className="widget-content">
            <h3>Active Pipeline</h3>
            <div className="widget-stats">
              <div className="pipeline-breakdown">
                <div className="pipeline-stage">
                  <span className="stage-count">{savedCount}</span>
                  <span className="stage-label">Saved</span>
                </div>
                <div className="pipeline-stage">
                  <span className="stage-count">{intelCount}</span>
                  <span className="stage-label">Researching</span>
                </div>
                <div className="pipeline-stage">
                  <span className="stage-count">{outreachCount}</span>
                  <span className="stage-label">Active</span>
                </div>
              </div>
            </div>
            <button onClick={() => navigate(createPageUrl('Manage'))} className="widget-action">
              Manage Pipeline →
            </button>
          </div>
        </div>

        {/* Widget 3: Companies & Contacts */}
        <div className="widget">
          <div className="widget-icon">🏢</div>
          <div className="widget-content">
            <h3>Companies & Contacts</h3>
            <div className="widget-stats">
              <div className="stat-item">
                <span className="stat-number">{companiesTracked}</span>
                <span className="stat-label">Companies Tracked</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{contactsFound}</span>
                <span className="stat-label">Decision Makers Found</span>
              </div>
            </div>
            <button onClick={() => navigate(createPageUrl('Manage'))} className="widget-action">
              View Companies →
            </button>
          </div>
        </div>

        {/* Widget 4: Discovery Status */}
        <div className="widget">
          <div className="widget-icon">⚙️</div>
          <div className="widget-content">
            <h3>Discovery Engine</h3>
            <div className="widget-stats">
              <div className="status-item">
                <span className="status-badge status-active">✅ Active</span>
                <span className="status-label">Monitoring {activeSources} sources</span>
              </div>
              <div className="status-item">
                <span className="status-text">Last run: {lastRunTime}</span>
              </div>
            </div>
            <button onClick={() => navigate(createPageUrl('Settings') + '?tab=discovery')} className="widget-action">
              Discovery Settings →
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button onClick={() => runDiscoveryMutation.mutate()} className="action-btn" disabled={runDiscoveryMutation.isPending}>
            🔍 Run Discovery Now
          </button>
          <button onClick={() => navigate(createPageUrl('Discover'))} className="action-btn">
            📋 Browse Opportunities
          </button>
          <button onClick={() => navigate(createPageUrl('Settings') + '?tab=job-search')} className="action-btn">
            🎯 Update Target Roles
          </button>
        </div>
      </div>
    </div>
  );
}