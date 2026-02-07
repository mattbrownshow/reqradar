import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, FileText, Handshake, CalendarDays,
  ArrowUpRight, Search, Target, Clock, CheckCircle2,
  Send, MessageSquare, TrendingUp, ChevronRight, MapPin, Users, ChevronDown,
  BarChart3, Briefcase
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
  const repliesAwaitingResponse = responses.length;
  
  // Calculate dashboard data
  const newRoles = openRoles.filter(r => r.status === 'new').length;
  const highestMatch = newRoles > 0 ? Math.max(...openRoles.filter(r => r.status === 'new').map(r => r.match_score || 0)) : 0;
  const applicationsInProgress = jobPipeline.filter(j => !['rejected', 'not_interested', 'offer'].includes(j.stage)).length;
  const activeMonitors = rssFeeds.filter(f => f.status === 'active').length;
  const companiesWithoutOutreach = companies.filter(c => {
    const hasOutreach = outreach.some(o => o.company_id === c.id);
    return !hasOutreach;
  }).length;
  const savedNotActivated = jobPipeline.filter(j => j.stage === 'saved').length;
  
  // Weekly stats - last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyDiscovered = openRoles.filter(r => new Date(r.created_date) > weekAgo).length;
  const weeklyActivated = jobPipeline.filter(j => j.applied_at && new Date(j.applied_at) > weekAgo).length;
  const weeklyInterviews = interviews.filter(i => new Date(i.created_date) > weekAgo).length;

  const activityIcons = {
    application: <FileText className="w-4 h-4 text-blue-500" />,
    outreach: <Send className="w-4 h-4 text-[#F7931E]" />,
    response: <MessageSquare className="w-4 h-4 text-emerald-500" />,
    interview: <CalendarDays className="w-4 h-4 text-purple-500" />,
    status_change: <TrendingUp className="w-4 h-4 text-indigo-500" />,
    company_added: <Building2 className="w-4 h-4 text-gray-500" />,
  };

  // Dynamic operational status message - priority driven
  let statusMessage = '';
  let activationPhase = '';
  
  if (repliesAwaitingResponse > 0) {
    statusMessage = `You have ${repliesAwaitingResponse} decision maker ${repliesAwaitingResponse === 1 ? 'reply' : 'replies'} awaiting response.`;
    activationPhase = 'engage';
  } else if (companiesWithoutOutreach > 0) {
    statusMessage = `${companiesWithoutOutreach} ${companiesWithoutOutreach === 1 ? 'opportunity is' : 'opportunities are'} ready for outreach activation.`;
    activationPhase = 'activate';
  } else if (companies.length >= 3) {
    statusMessage = `Decision makers identified for ${Math.min(companies.length, 5)} opportunities.`;
    activationPhase = 'map';
  } else if (newRoles > 0) {
    statusMessage = `${newRoles} new executive ${newRoles === 1 ? 'opportunity' : 'opportunities'} surfaced overnight.`;
    activationPhase = 'discover';
  } else if (weeklyInterviews > 0) {
    statusMessage = `${weeklyInterviews} ${weeklyInterviews === 1 ? 'interview is' : 'interviews are'} scheduled this week.`;
    activationPhase = 'interview';
  } else {
    statusMessage = `Ready to surface new opportunities.`;
    activationPhase = 'discover';
  }

  // Dynamic action cards - reordered by opportunity progression
  let primaryCard, secondaryCard, tertiaryCard;
  
  // Primary: Next best opportunity activation action
  if (savedNotActivated > 0) {
    // State 1: Opportunities awaiting activation
    primaryCard = {
      icon: Target,
      title: `Activate ${savedNotActivated} ${savedNotActivated === 1 ? 'opportunity' : 'opportunity'} ready for executive engagement`,
      description: 'Decision makers are mapped. Activation will initiate pursuit tracking.',
      ctaText: 'Activate Opportunity →',
      ctaLink: createPageUrl('JobsPipeline')
    };
  } else if (companiesWithoutOutreach > 0 && sentOutreach.length === 0) {
    // State 2: Decision makers mapped, outreach not started
    primaryCard = {
      icon: Handshake,
      title: `Executive access secured at ${companiesWithoutOutreach} ${companiesWithoutOutreach === 1 ? 'opportunity' : 'opportunity'}`,
      description: 'Decision makers identified. Initiate engagement to begin pursuit.',
      ctaText: 'Initiate Engagement →',
      ctaLink: createPageUrl('CompanyDetail')
    };
  } else if (sentOutreach.length > 0 && responses.length === 0) {
    // State 3: Outreach active, no replies
    primaryCard = {
      icon: Send,
      title: `Engagement in motion across ${sentOutreach.length} ${sentOutreach.length === 1 ? 'executive' : 'executives'}`,
      description: 'Outreach deployed. Monitoring replies and response signals.',
      ctaText: 'View Conversations →',
      ctaLink: createPageUrl('Outreach')
    };
  } else if (repliesAwaitingResponse > 0) {
    // State 4: Replies received awaiting response
    primaryCard = {
      icon: MessageSquare,
      title: `Executive ${repliesAwaitingResponse === 1 ? 'reply' : 'replies'} awaiting response`,
      description: 'Active conversations require follow-up to maintain momentum.',
      ctaText: 'Respond Now →',
      ctaLink: createPageUrl('Outreach')
    };
  } else if (interviews.length > 0) {
    // State 5: Interviews scheduled
    primaryCard = {
      icon: CalendarDays,
      title: `${interviews.length} executive ${interviews.length === 1 ? 'meeting' : 'meetings'} scheduled`,
      description: 'Prepare for conversations and advance opportunity progression.',
      ctaText: 'View Schedule →',
      ctaLink: createPageUrl('Dashboard')
    };
  } else {
    // Fallback: No active pursuits
    primaryCard = {
      icon: Target,
      title: 'No active pursuits in motion',
      description: 'Discovery is surfacing opportunities. Activate targets to begin executive engagement.',
      ctaText: 'Review Opportunities →',
      ctaLink: createPageUrl('Discover')
    };
  }

  // Secondary: Pipeline momentum
  secondaryCard = {
    icon: BarChart3,
    title: `${applicationsInProgress} ${applicationsInProgress === 1 ? 'opportunity' : 'opportunities'} in active pursuit`,
    description: companiesWithoutOutreach > 0 ? `${companiesWithoutOutreach} decision makers mapped` : 'Outreach launched and in progress',
    ctaText: 'Continue Pursuit →',
    ctaLink: createPageUrl('JobsPipeline')
  };

  // Tertiary: Discovery automation health
  tertiaryCard = {
    icon: Briefcase,
    title: 'Discovery automation active',
    description: `Monitoring ${activeMonitors} ${activeMonitors === 1 ? 'source' : 'sources'} for new opportunities`,
    ctaText: 'Discovery Settings →',
    ctaLink: createPageUrl('DiscoverySources')
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
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 158, 77, 0.1);
          border-radius: 12px;
        }
        
        .card-icon svg {
          width: 24px;
          height: 24px;
          color: #FF9E4D;
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
          <div className="card-icon">
            <primaryCard.icon />
          </div>
          <div>
            <h3 className="card-title">{primaryCard.title}</h3>
            <p className="card-description">{primaryCard.description}</p>
          </div>
          <button className="card-cta" onClick={() => window.location.href = primaryCard.ctaLink}>{primaryCard.ctaText}</button>
        </div>

        {/* Secondary Card */}
        <div className="action-card">
          <div className="card-icon">
            <secondaryCard.icon />
          </div>
          <div>
            <h3 className="card-title">{secondaryCard.title}</h3>
            <p className="card-description">{secondaryCard.description}</p>
          </div>
          <button className="card-cta" onClick={() => window.location.href = secondaryCard.ctaLink}>{secondaryCard.ctaText}</button>
        </div>

        {/* Tertiary Card */}
        <div className="action-card">
          <div className="card-icon">
            <tertiaryCard.icon />
          </div>
          <div>
            <h3 className="card-title">{tertiaryCard.title}</h3>
            <p className="card-description">{tertiaryCard.description}</p>
          </div>
          <button className="card-cta" onClick={() => window.location.href = tertiaryCard.ctaLink}>{tertiaryCard.ctaText}</button>
        </div>
      </div>

      {/* Weekly Summary - Momentum Messaging */}
      <details className="weekly-summary">
        <summary>
          <span>
            {weeklyInterviews > 0 ? (
              `${weeklyInterviews} ${weeklyInterviews === 1 ? 'interview was' : 'interviews were'} scheduled this week.`
            ) : weeklyActivated > 0 ? (
              `You activated ${weeklyActivated} ${weeklyActivated === 1 ? 'opportunity' : 'opportunities'} this week. Outreach is underway.`
            ) : weeklyDiscovered > 0 ? (
              `You surfaced ${weeklyDiscovered} new ${weeklyDiscovered === 1 ? 'opportunity' : 'opportunities'} this week. Activation hasn't started yet.`
            ) : (
              `Stay tuned for new discovery. Automation is monitoring for opportunities.`
            )}
          </span>
          <ChevronDown className="w-4 h-4 transition-transform chevron-icon" />
        </summary>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="stat-row">
            <span className="stat-label">Opportunities discovered</span>
            <span className="stat-value">{weeklyDiscovered}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Opportunities activated</span>
            <span className="stat-value">{weeklyActivated}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Interviews scheduled</span>
            <span className="stat-value">{weeklyInterviews}</span>
          </div>
          <Link to={createPageUrl("Analytics")} className="inline-block mt-4 text-[#FF9E4D] font-semibold text-sm hover:underline">
            View full momentum metrics →
          </Link>
        </div>
      </details>

      {/* All Metrics Collapsible */}
      <details className="bg-white border border-gray-100 rounded-2xl p-6">
        <summary className="cursor-pointer text-gray-600 text-sm font-medium">View full momentum metrics</summary>
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
            title="Opportunities Activated"
            value={applications.length}
            subtitle="In progress"
            trend={weeklyActivated + " this week"}
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
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">Activity will appear as you launch outreach campaigns and executives engage with your inquiries.</p>
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

        {/* Activation Widgets */}
        <div className="space-y-4">
          {companiesWithoutOutreach > 0 && (
            <div className="bg-gradient-to-br from-[#FEF3E2] to-orange-50 rounded-2xl p-6 border border-orange-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Send className="w-5 h-5 text-[#F7931E]" />
                </div>
                <h3 className="font-semibold text-gray-900">Decision Makers Ready</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {companiesWithoutOutreach} decision {companiesWithoutOutreach === 1 ? 'maker' : 'makers'} mapped and ready for outreach
              </p>
              <Link to={createPageUrl("Outreach")}>
                <Button className="w-full bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2">
                  Launch Outreach <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {repliesAwaitingResponse > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Replies Awaiting Response</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {repliesAwaitingResponse} executive {repliesAwaitingResponse === 1 ? 'reply' : 'replies'} ready for follow-up
              </p>
              <Link to={createPageUrl("Outreach")}>
                <Button variant="outline" className="w-full rounded-xl gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  Open Conversation <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {savedNotActivated > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="font-semibold text-gray-900">Opportunities Awaiting Activation</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {savedNotActivated} {savedNotActivated === 1 ? 'opportunity is' : 'opportunities are'} saved but not activated
              </p>
              <Link to={createPageUrl("ActiveOpportunities")}>
                <Button variant="outline" className="w-full rounded-xl gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                  Activate Opportunities <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

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
                          <span className="text-xs font-bold text-[#F7931E] shrink-0">{Math.round(company.match_score * 100)}%</span>
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