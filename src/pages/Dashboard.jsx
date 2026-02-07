import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import MetricCard from "../components/shared/MetricCard";
import {
  Building2, Users, Send, TrendingUp, Sparkles, 
  ArrowRight, Target, Briefcase, MessageSquare
} from "lucide-react";

export default function Dashboard() {
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ tracked: true }),
  });

  const { data: openRoles = [] } = useQuery({
    queryKey: ["openRoles"],
    queryFn: () => base44.entities.OpenRole.list(),
  });

  const { data: pipeline = [] } = useQuery({
    queryKey: ["jobPipeline"],
    queryFn: () => base44.entities.JobPipeline.list(),
  });

  const { data: outreach = [] } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => base44.entities.OutreachMessage.list(),
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["suggestions"],
    queryFn: () => base44.entities.SuggestedCompany.filter({ status: "new" }),
  });

  const { data: profile } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: async () => {
      const profiles = await base44.entities.CandidateProfile.list();
      return profiles[0];
    },
  });

  // Calculate insights
  const highMatchRoles = openRoles.filter(r => r.match_score >= 85);
  const activeApplications = pipeline.filter(p => ["applied", "interviewing"].includes(p.stage));
  const newSuggestions = suggestions.length;
  const needsResearchCompanies = companies.filter(c => c.pipeline_stage === "research");

  // Determine dynamic status message
  let statusMessage = "Your job search is on track";
  let statusIcon = TrendingUp;
  let statusColor = "text-green-600";

  if (highMatchRoles.length > 0) {
    statusMessage = `${highMatchRoles.length} high-match role${highMatchRoles.length > 1 ? 's' : ''} need${highMatchRoles.length === 1 ? 's' : ''} your attention`;
    statusIcon = Target;
    statusColor = "text-[#F7931E]";
  } else if (activeApplications.length > 0) {
    statusMessage = `${activeApplications.length} application${activeApplications.length > 1 ? 's' : ''} in progress`;
    statusIcon = Briefcase;
    statusColor = "text-blue-600";
  } else if (newSuggestions > 0) {
    statusMessage = `${newSuggestions} new compan${newSuggestions > 1 ? 'ies' : 'y'} match${newSuggestions === 1 ? 'es' : ''} your profile`;
    statusIcon = Sparkles;
    statusColor = "text-purple-600";
  }

  const StatusIcon = statusIcon;

  // Action cards
  const actionCards = [];

  if (highMatchRoles.length > 0) {
    actionCards.push({
      icon: Target,
      title: `Review ${highMatchRoles.length} high-match role${highMatchRoles.length > 1 ? 's' : ''}`,
      description: `${highMatchRoles[0]?.match_score}% match: ${highMatchRoles[0]?.title} at ${highMatchRoles[0]?.company_name}`,
      action: "View Roles",
      link: "OpenRoles",
      color: "border-[#F7931E] bg-[#FEF3E2]",
      iconColor: "text-[#F7931E]"
    });
  }

  if (needsResearchCompanies.length > 0) {
    actionCards.push({
      icon: Building2,
      title: "Companies to Research",
      description: `${needsResearchCompanies.slice(0, 2).map(c => c.name).join(", ")} need research${needsResearchCompanies.length > 2 ? ` +${needsResearchCompanies.length - 2} more` : ''}`,
      action: "Start Research",
      link: "Companies",
      color: "border-blue-200 bg-blue-50",
      iconColor: "text-blue-600"
    });
  }

  if (activeApplications.length > 0) {
    const app = activeApplications[0];
    actionCards.push({
      icon: Briefcase,
      title: "Applications in Progress",
      description: `${app.stage === "applied" ? "Find decision makers" : "Prepare for interview"}`,
      action: "Continue",
      link: "JobsPipeline",
      color: "border-purple-200 bg-purple-50",
      iconColor: "text-purple-600"
    });
  }

  if (newSuggestions > 0) {
    actionCards.push({
      icon: Sparkles,
      title: "New Discoveries",
      description: `${newSuggestions} compan${newSuggestions > 1 ? 'ies' : 'y'} found overnight matching your profile`,
      action: "Review Now",
      link: "DailySuggestions",
      color: "border-purple-200 bg-purple-50",
      iconColor: "text-purple-600"
    });
  }

  // Weekly summary
  const thisWeekRoles = openRoles.filter(r => {
    const postedDate = new Date(r.posted_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return postedDate >= weekAgo;
  }).length;

  const thisWeekApplications = pipeline.filter(p => {
    const appliedDate = new Date(p.applied_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return appliedDate >= weekAgo;
  }).length;

  return (
    <div className="px-4 sm:px-6 py-8 space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <div className={`flex items-center gap-2 ${statusColor}`}>
          <StatusIcon className="w-5 h-5" />
          <p className="text-lg font-medium">{statusMessage}</p>
        </div>
      </div>

      {/* Action Cards */}
      {actionCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actionCards.slice(0, 3).map((card, idx) => {
            const CardIcon = card.icon;
            return (
              <Link
                key={idx}
                to={createPageUrl(card.link)}
                className={`border-2 ${card.color} rounded-lg p-6 hover:shadow-lg transition-all group`}
              >
                <div className="flex items-start justify-between mb-4">
                  <CardIcon className={`w-8 h-8 ${card.iconColor}`} />
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{card.description}</p>
                <span className={`text-sm font-medium ${card.iconColor}`}>{card.action} →</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {actionCards.length === 0 && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-12 text-center">
          <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to start your search?</h3>
          <p className="text-gray-600 mb-6">Add companies to your target list or let our discovery engine find matches for you.</p>
          <div className="flex gap-3 justify-center">
            <Link to={createPageUrl("Companies")}>
              <Button>
                <Building2 className="w-4 h-4 mr-2" />
                Add Companies
              </Button>
            </Link>
            <Link to={createPageUrl("DailySuggestions")}>
              <Button variant="outline">
                <Sparkles className="w-4 h-4 mr-2" />
                Discovery Engine
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Target Companies"
          value={companies.length}
          icon={Building2}
          trend={companies.length > 0 ? `${needsResearchCompanies.length} need research` : "Add your first company"}
        />
        <MetricCard
          title="Open Roles"
          value={openRoles.length}
          icon={Users}
          trend={highMatchRoles.length > 0 ? `${highMatchRoles.length} high match (85%+)` : ""}
        />
        <MetricCard
          title="In Pipeline"
          value={pipeline.length}
          icon={Target}
          trend={activeApplications.length > 0 ? `${activeApplications.length} active` : ""}
        />
        <MetricCard
          title="Outreach Sent"
          value={outreach.filter(o => o.status === "sent").length}
          icon={MessageSquare}
          trend={outreach.filter(o => o.status === "responded").length > 0 ? `${outreach.filter(o => o.status === "responded").length} replied` : ""}
        />
      </div>

      {/* Weekly Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">This Week</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="text-2xl font-bold text-gray-900">{thisWeekRoles}</div>
            <div className="text-sm text-gray-600">Roles discovered</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{thisWeekApplications}</div>
            <div className="text-sm text-gray-600">Applications submitted</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {pipeline.filter(p => p.stage === "interviewing").length}
            </div>
            <div className="text-sm text-gray-600">Active interviews</div>
          </div>
        </div>
        <Link to={createPageUrl("Analytics")} className="mt-4 inline-flex items-center text-sm text-[#F7931E] font-medium hover:underline">
          View full analytics <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
    </div>
  );
}