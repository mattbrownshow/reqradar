import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, FileText, Handshake, CalendarDays,
  ArrowUpRight, Search, Target, Clock, CheckCircle2,
  Send, MessageSquare, TrendingUp, ChevronRight, Edit, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "../components/shared/MetricCard";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function Dashboard() {
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedCompanySizes, setSelectedCompanySizes] = useState([]);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 100),
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

  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: () => base44.entities.CandidateProfile.list("-created_date", 1),
  });

  const profile = profiles[0];

  const interviews = applications.filter(a => a.status === "interview");
  const sentOutreach = outreach.filter(o => o.status !== "draft");
  const responses = outreach.filter(o => o.status === "responded");

  const activityIcons = {
    application: <FileText className="w-4 h-4 text-blue-500" />,
    outreach: <Send className="w-4 h-4 text-[#F7931E]" />,
    response: <MessageSquare className="w-4 h-4 text-emerald-500" />,
    interview: <CalendarDays className="w-4 h-4 text-purple-500" />,
    status_change: <TrendingUp className="w-4 h-4 text-indigo-500" />,
    company_added: <Building2 className="w-4 h-4 text-gray-500" />,
  };

  return (
    <div className="px-4 sm:px-6 py-8 space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FEF3E2] via-white to-orange-50 rounded-3xl p-8 sm:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F7931E] opacity-5 rounded-full -translate-y-32 translate-x-32" />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Welcome to <span style={{ color: "#F7931E" }}>Flowzyn</span>
          </h1>
          <p className="mt-3 text-gray-500 text-lg max-w-xl">
            Executive job search excellence powered by AI automation
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={createPageUrl("Companies")}>
              <Button className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2">
                <Building2 className="w-4 h-4" />
                View All Companies
              </Button>
            </Link>
            <Link to={createPageUrl("OpenRoles")}>
              <Button variant="outline" className="rounded-xl gap-2 border-gray-200">
                <FileText className="w-4 h-4" />
                View All Roles
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Job Search Preferences Section */}
      <div className="bg-gradient-to-br from-[#FFF5E6] to-white border-2 border-[#F7931E] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <h2 className="text-lg font-semibold text-gray-900">Your Job Search Preferences</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (profile) {
                setSelectedIndustries(profile.industries || []);
                setSelectedCompanySizes(profile.company_sizes || []);
              }
              setShowPreferencesModal(true);
            }}
            className="gap-2 rounded-lg"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </div>

        {profile ? (
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-semibold text-gray-600 min-w-[140px]">Target Roles:</span>
              <span className="text-sm text-gray-900">
                {profile.target_roles?.length > 0 ? profile.target_roles.join(", ") : "Not set"}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-semibold text-gray-600 min-w-[140px]">Industries:</span>
              <span className="text-sm text-gray-900">
                {profile.industries?.length > 0 ? profile.industries.join(", ") : "All industries"}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-semibold text-gray-600 min-w-[140px]">Location:</span>
              <span className="text-sm text-gray-900">
                {profile.preferred_locations?.length > 0
                  ? `${profile.preferred_locations.join(", ")}${profile.remote_preferences?.includes("Remote") ? " + Remote OK" : ""}`
                  : profile.remote_preferences?.includes("Remote") ? "Remote only" : "Any location"}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-semibold text-gray-600 min-w-[140px]">Salary Range:</span>
              <span className="text-sm text-gray-900">
                ${profile.min_salary?.toLocaleString() || "0"} - ${profile.max_salary?.toLocaleString() || "999,999"}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-semibold text-gray-600 min-w-[140px]">Company Size:</span>
              <span className="text-sm text-gray-900">
                {profile.company_sizes?.length > 0 ? profile.company_sizes.join(", ") : "All sizes"}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">Complete your profile to set job search preferences</p>
            <Link to={createPageUrl("CandidateSetup")}>
              <Button className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl">
                Set Up Profile
              </Button>
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 p-3 bg-yellow-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-xs text-yellow-800">
            These preferences control which jobs appear in your feed and RSS results
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          trend={applications.filter(a => {
            const d = new Date(a.created_date);
            const now = new Date();
            return d > new Date(now - 7 * 24 * 60 * 60 * 1000);
          }).length + " this week"}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl">
          <div className="p-6 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No activity yet. Start by adding companies or applying to roles.
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
                  className="flex items-center justify-between py-1 group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-600">
                      {company.match_score || "–"}
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-[#F7931E] transition-colors">
                      {company.name}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#F7931E] transition-colors" />
                </Link>
              ))}
              {companies.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">No companies yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Preferences Modal */}
      <Dialog open={showPreferencesModal} onOpenChange={setShowPreferencesModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Search Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <p className="text-sm text-gray-500">
              Update your preferences to refine job matches and RSS feed results
            </p>

            {/* Target Roles */}
            <div>
              <Label className="text-base font-semibold">Target Roles *</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                The executive roles you're targeting (shown on your profile)
              </p>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  {profile?.target_roles?.join(", ") || "Not set"}
                </p>
              </div>
              <Link to={createPageUrl("CandidateSetup")} className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                Edit in Profile Setup →
              </Link>
            </div>

            {/* Industries */}
            <div>
              <Label className="text-base font-semibold">Preferred Industries</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Select industries you're interested in (optional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {["Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Professional Services", "Energy", "Real Estate"].map(industry => (
                  <label key={industry} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={selectedIndustries.includes(industry)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIndustries([...selectedIndustries, industry]);
                        } else {
                          setSelectedIndustries(selectedIndustries.filter(i => i !== industry));
                        }
                      }}
                    />
                    <span className="text-sm">{industry}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Location Preferences */}
            <div>
              <Label className="text-base font-semibold">Location Preferences</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                Preferred locations (shown on your profile)
              </p>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  {profile?.preferred_locations?.join(", ") || "Not set"}
                </p>
                {profile?.remote_preferences?.includes("Remote") && (
                  <p className="text-sm text-green-600 mt-1">✓ Remote work preferred</p>
                )}
              </div>
              <Link to={createPageUrl("CandidateSetup")} className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                Edit in Profile Setup →
              </Link>
            </div>

            {/* Salary Range */}
            <div>
              <Label className="text-base font-semibold">Salary Range</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                Target compensation range (shown on your profile)
              </p>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  ${profile?.min_salary?.toLocaleString() || "0"} - ${profile?.max_salary?.toLocaleString() || "999,999"}
                </p>
              </div>
              <Link to={createPageUrl("CandidateSetup")} className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                Edit in Profile Setup →
              </Link>
            </div>

            {/* Company Size */}
            <div>
              <Label className="text-base font-semibold">Company Size (Employees)</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Select your preferred company sizes
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Startup (1-50)", value: "1-50" },
                  { label: "Small (51-200)", value: "51-200" },
                  { label: "Mid-size (201-1000)", value: "201-1000" },
                  { label: "Enterprise (1000+)", value: "1000+" }
                ].map(size => (
                  <label key={size.value} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={selectedCompanySizes.includes(size.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCompanySizes([...selectedCompanySizes, size.value]);
                        } else {
                          setSelectedCompanySizes(selectedCompanySizes.filter(s => s !== size.value));
                        }
                      }}
                    />
                    <span className="text-sm">{size.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPreferencesModal(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl"
                onClick={async () => {
                  if (profile) {
                    await base44.entities.CandidateProfile.update(profile.id, {
                      industries: selectedIndustries,
                      company_sizes: selectedCompanySizes
                    });
                    window.location.reload();
                  }
                }}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}