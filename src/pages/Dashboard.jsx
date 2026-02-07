import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, FileText, Handshake, CalendarDays,
  ArrowUpRight, Search, Target, Clock, CheckCircle2,
  Send, MessageSquare, TrendingUp, ChevronRight, MapPin, Users, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "../components/shared/MetricCard";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";

export default function Dashboard() {
  const [userName, setUserName] = useState("User");
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 100),
  });

  const { data: openRoles = [] } = useQuery({
    queryKey: ["openRoles"],
    queryFn: () => base44.entities.OpenRole.list("-created_date", 100),
  });

  const { data: jobPipeline = [] } = useQuery({
    queryKey: ["jobPipeline"],
    queryFn: () => base44.entities.JobPipeline.list("-created_date", 100),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => base44.entities.Application.list("-created_date", 100),
  });

  const { data: outreach = [] } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => base44.entities.OutreachMessage.list("-created_date", 100),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.ActivityLog.list("-created_date", 20),
  });

  const { data: rssFeeds = [] } = useQuery({
    queryKey: ["rssFeeds"],
    queryFn: () => base44.entities.RSSFeed.list(),
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setUserName(user?.full_name?.split(' ')[0] || 'User');
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  const interviews = applications.filter(a => a.status === "interview");
  const sentOutreach = outreach.filter(o => o.status !== "draft");
  const responses = outreach.filter(o => o.status === "responded");
  
  // Calculate dashboard data
  const newRoles = openRoles.filter(r => r.status === 'new').length;
  const highestMatch = newRoles > 0 ? Math.max(...openRoles.filter(r => r.status === 'new').map(r => r.match_score || 0)) : 0;
  const applicationsInProgress = jobPipeline.filter(j => !['rejected', 'not_interested', 'offer'].includes(j.stage)).length;
  const activeMonitors = rssFeeds.filter(f => f.status === 'active').length;
  
  // Weekly stats - last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyDiscovered = openRoles.filter(r => new Date(r.created_date) > weekAgo).length;
  const weeklyApplied = jobPipeline.filter(j => j.applied_at && new Date(j.applied_at) > weekAgo).length;
  const weeklyInterviews = jobPipeline.filter(j => j.interview_date && new Date(j.interview_date) > weekAgo).length;

  const activityIcons = {
    application: <FileText className="w-4 h-4 text-blue-500" />,
    outreach: <Send className="w-4 h-4 text-[#F7931E]" />,
    response: <MessageSquare className="w-4 h-4 text-emerald-500" />,
    interview: <CalendarDays className="w-4 h-4 text-purple-500" />,
    status_change: <TrendingUp className="w-4 h-4 text-indigo-500" />,
    company_added: <Building2 className="w-4 h-4 text-gray-500" />,
  };

  // Determine status message
  let statusMessage = '';
  if (newRoles > 0) {
    statusMessage = `${newRoles} high-match ${newRoles === 1 ? 'role needs' : 'roles need'} your attention`;
  } else if (applicationsInProgress > 0) {
    statusMessage = `You have ${applicationsInProgress} ${applicationsInProgress === 1 ? 'application' : 'applications'} in progress`;
  } else {
    statusMessage = `Ready to discover opportunities`;
  }

  // Determine action cards
  let primaryCard, secondaryCard, tertiaryCard;
  
  if (newRoles > 0) {
    primaryCard = {
      icon: '🎯',
      title: `Review ${newRoles} new ${newRoles === 1 ? 'role' : 'roles'}${highestMatch > 0 ? ` (${highestMatch}% match)` : ''}`,
      description: 'Found overnight matching your target profile',
      ctaText: 'View Roles →',
      ctaLink: createPageUrl('OpenRoles')
    };
  } else if (companies.length < 5) {
    primaryCard = {
      icon: '🎯',
      title: 'Discover new opportunities',
      description: 'Search thousands of companies hiring for your target role',
      ctaText: 'Start Searching →',
      ctaLink: createPageUrl('Companies')
    };
  } else {
    primaryCard = {
      icon: '🎯',
      title: 'Check daily suggestions',
      description: 'AI discovers new matching companies overnight',
      ctaText: 'View Suggestions →',
      ctaLink: createPageUrl('DailySuggestions')
    };
  }
  
  if (applicationsInProgress > 0) {
    secondaryCard = {
      icon: '📊',
      title: `${applicationsInProgress} ${applicationsInProgress === 1 ? 'application' : 'applications'} in progress`,
      description: 'Continue with next steps',
      ctaText: 'Continue →',
      ctaLink: createPageUrl('JobsPipeline')
    };
  } else {
    secondaryCard = {
      icon: '📊',
      title: 'Manage your pipeline',
      description: 'Track applications and interviews',
      ctaText: 'View Pipeline →',
      ctaLink: createPageUrl('JobsPipeline')
    };
  }
  
  tertiaryCard = {
    icon: '💼',
    title: 'Auto-monitoring active',
    description: `Checking ${activeMonitors} ${activeMonitors === 1 ? 'source' : 'sources'} for new roles daily`,
    ctaText: 'Manage Sources →',
    ctaLink: createPageUrl('JobBoards')
  };

  return (
    <div className="px-4 sm:px-6 py-8 lg:py-12 space-y-8">
      <style>{`
        .dashboard-header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #1A1A1A;
          margin-bottom: 8px;
        }
        
        .status-message {
          font-size: 18px;
          color: #6B7280;
        }
        
        .action-card {
          background: white;
          border: 2px solid #E5E5E5;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.2s;
        }
        
        .action-card:hover {
          border-color: #FF9E4D;
          box-shadow: 0 4px 12px rgba(255, 158, 77, 0.1);
        }
        
        .action-card.priority {
          border-color: #FF9E4D;
          background: linear-gradient(135deg, #FFF9F5 0%, #FFFFFF 100%);
        }
        
        .card-icon {
          font-size: 32px;
          line-height: 1;
        }
        
        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: #1A1A1A;
          margin-bottom: 8px;
        }
        
        .card-description {
          font-size: 14px;
          color: #6B7280;
          line-height: 1.5;
        }
        
        .card-cta {
          background: #FF9E4D;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .card-cta:hover {
          background: #E8893D;
        }
        
        .action-card:not(.priority) .card-cta {
          background: transparent;
          color: #FF9E4D;
          border: 2px solid #FF9E4D;
        }
        
        .action-card:not(.priority) .card-cta:hover {
          background: #FFF9F5;
        }
        
        .weekly-summary {
          background: white;
          border: 1px solid #E5E5E5;
          border-radius: 12px;
          padding: 24px;
        }
        
        .weekly-summary summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          list-style: none;
          font-weight: 600;
          color: #1A1A1A;
        }
        
        .weekly-summary summary::-webkit-details-marker {
          display: none;
        }
        
        .weekly-summary[open] .chevron-icon {
          transform: rotate(180deg);
        }
        
        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #F3F4F6;
        }
        
        .stat-label {
          color: #6B7280;
          font-size: 14px;
        }
        
        .stat-value {
          color: #1A1A1A;
          font-weight: 600;
          font-size: 16px;
        }
      `}</style>

      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h1>Good morning, {userName}</h1>
        <p className="status-message">{statusMessage}</p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Primary Card */}
        <div className="action-card priority">
          <div className="card-icon">{primaryCard.icon}</div>
          <div>
            <h3 className="card-title">{primaryCard.title}</h3>
            <p className="card-description">{primaryCard.description}</p>
          </div>
          <button className="card-cta" onClick={() => window.location.href = primaryCard.ctaLink}>{primaryCard.ctaText}</button>
        </div>

        {/* Secondary Card */}
        <div className="action-card">
          <div className="card-icon">{secondaryCard.icon}</div>
          <div>
            <h3 className="card-title">{secondaryCard.title}</h3>
            <p className="card-description">{secondaryCard.description}</p>
          </div>
          <button className="card-cta" onClick={() => window.location.href = secondaryCard.ctaLink}>{secondaryCard.ctaText}</button>
        </div>

        {/* Tertiary Card */}
        <div className="action-card">
          <div className="card-icon">{tertiaryCard.icon}</div>
          <div>
            <h3 className="card-title">{tertiaryCard.title}</h3>
            <p className="card-description">{tertiaryCard.description}</p>
          </div>
          <button className="card-cta" onClick={() => window.location.href = tertiaryCard.ctaLink}>{tertiaryCard.ctaText}</button>
        </div>
      </div>

      {/* Weekly Summary */}
      <details className="weekly-summary">
        <summary>
          <span>This week: {weeklyDiscovered} roles discovered, {weeklyApplied} applied, {weeklyInterviews} interviews</span>
          <ChevronDown className="w-4 h-4 transition-transform chevron-icon" />
        </summary>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="stat-row">
            <span className="stat-label">Roles discovered</span>
            <span className="stat-value">{weeklyDiscovered}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Applications submitted</span>
            <span className="stat-value">{weeklyApplied}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Interviews scheduled</span>
            <span className="stat-value">{weeklyInterviews}</span>
          </div>
          <Link to={createPageUrl("Analytics")} className="inline-block mt-4 text-[#FF9E4D] font-semibold text-sm hover:underline">
            View full analytics →
          </Link>
        </div>
      </details>

      {/* All Metrics Collapsible */}
      <details className="bg-white border border-gray-100 rounded-2xl p-6">
        <summary className="cursor-pointer text-gray-600 text-sm font-medium">View all metrics</summary>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <MetricCard
            icon={Building2}
            title="Total Companies"
            value={companies.length}
            subtitle="In your target list"
            trend={companies.length > 0 ? `${companies.length} tracked` : "Start adding companies"}
          />
          <MetricCard
            icon={FileText}
            title="Applications"
            value={applications.length}
            subtitle="Submitted"
            trend={weeklyApplied + " this week"}
            bgColor="bg-blue-50"
            iconColor="text-blue-500"
          />
          <MetricCard
            icon={Handshake}
            title="Outreach Sent"
            value={sentOutreach.length}
            subtitle="To decision makers"
            trend={responses.length + " responses"}
            bgColor="bg-purple-50"
            iconColor="text-purple-500"
          />
          <MetricCard
            icon={CalendarDays}
            title="Interviews"
            value={interviews.length}
            subtitle={interviews.length > 0 ? "Active interviews" : "No upcoming interviews"}
            bgColor="bg-emerald-50"
            iconColor="text-emerald-500"
          />
        </div>
      </details>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl">
          <div className="p-6 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Your activity feed will show your job search actions here - applications submitted, companies added, outreach sent, interview updates, and status changes.
              </div>
            ) : (
              activities.slice(0, 8).map((activity) => (
                <div key={activity.id} className="px-6 py-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mt-0.5 shrink-0">
                    {activityIcons[activity.type] || <Clock className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {format(new Date(activity.created_date), "MMM d, h:mm a")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#FEF3E2] to-orange-50 rounded-2xl p-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Search className="w-5 h-5 text-[#F7931E]" />
              </div>
              <h3 className="font-semibold text-gray-900">Find Companies</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Discover target companies matching your executive profile
            </p>
            <Link to={createPageUrl("Companies")}>
              <Button className="w-full bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2">
                Start Searching <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-900">Search Job Boards</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Aggregate executive roles from Indeed, LinkedIn, and more
            </p>
            <Link to={createPageUrl("JobBoards")}>
              <Button variant="outline" className="w-full rounded-xl gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                Search Now <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Top Companies</h3>
            <div className="space-y-3">
              {companies.slice(0, 4).map((company) => (
                <Link
                  key={company.id}
                  to={createPageUrl("CompanyDetail") + `?id=${company.id}`}
                  className="flex items-start justify-between py-2 group hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-lg object-contain bg-gray-50 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                        {company.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-[#F7931E] transition-colors truncate">
                          {company.name}
                        </span>
                        {company.match_score && (
                          <span className="text-xs font-bold text-[#F7931E] shrink-0">{company.match_score}%</span>
                        )}
                      </div>
                      {company.industry && (
                        <p className="text-xs text-gray-500 truncate">{company.industry}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {company.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{company.location}</span>
                          </div>
                        )}
                        {company.employee_count && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Users className="w-3 h-3" />
                            <span>{company.employee_count.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#F7931E] transition-colors shrink-0 mt-3" />
                </Link>
              ))}
              {companies.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">No companies yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}