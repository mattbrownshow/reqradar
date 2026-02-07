import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Briefcase, Search, MapPin, DollarSign, Building2, Clock,
  Check, X, Bookmark, ExternalLink, Loader2
} from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";

export default function OpenRoles() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isSearching, setIsSearching] = useState(false);

  const saveJobMutation = useMutation({
    mutationFn: (job_id) => 
      base44.functions.invoke("manageJobPipeline", { action: "save", job_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobPipeline"] });
    }
  });

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["openRoles"],
    queryFn: () => base44.entities.OpenRole.list("-match_score", 200),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: () => base44.entities.CandidateProfile.list("-created_date", 1),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OpenRole.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["openRoles"] }),
  });

  const applyMutation = useMutation({
    mutationFn: async (role) => {
      await base44.entities.OpenRole.update(role.id, { status: "applied" });
      await base44.entities.Application.create({
        role_id: role.id,
        company_id: role.company_id,
        company_name: role.company_name,
        role_title: role.title,
        status: "applied",
        applied_date: new Date().toISOString().split("T")[0],
        auto_applied: false,
      });
      await base44.entities.ActivityLog.create({
        type: "application",
        title: `Applied to ${role.title} at ${role.company_name}`,
        company_name: role.company_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openRoles"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const handleAISearch = async () => {
    setIsSearching(true);
    const profile = profiles[0] || {};
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find real executive job openings matching this profile:
      Target roles: ${(profile.target_roles || []).join(", ") || "CFO, CTO, COO"}
      Industries: ${(profile.industries || []).join(", ") || "Technology"}
      Locations: ${(profile.preferred_locations || []).join(", ") || "any US"}
      Salary range: $${profile.min_salary || 150000} - $${profile.max_salary || 350000}
      Additional search: "${searchTerm}"
      
      Return 6 realistic executive job postings with real company names.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          roles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                company_name: { type: "string" },
                industry: { type: "string" },
                location: { type: "string" },
                work_type: { type: "string" },
                salary_min: { type: "number" },
                salary_max: { type: "number" },
                reports_to: { type: "string" },
                description: { type: "string" },
                requirements: { type: "array", items: { type: "string" } },
                match_score: { type: "number" },
                match_reasons: { type: "array", items: { type: "string" } },
                source: { type: "string" }
              }
            }
          }
        }
      }
    });
    if (result.roles) {
      await base44.entities.OpenRole.bulkCreate(
        result.roles.map(r => ({
          ...r,
          status: "new",
          posted_date: new Date().toISOString().split("T")[0]
        }))
      );
      queryClient.invalidateQueries({ queryKey: ["openRoles"] });
    }
    setIsSearching(false);
  };

  const filtered = roles.filter(r => {
    const matchSearch = !searchTerm || r.title?.toLowerCase().includes(searchTerm.toLowerCase()) || r.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSource = sourceFilter === "all" || 
      (sourceFilter === "job-boards" && (r.source?.toLowerCase().includes("rss") || r.source?.toLowerCase().includes("feed") || r.source?.toLowerCase().includes("indeed") || r.source?.toLowerCase().includes("linkedin"))) ||
      (sourceFilter === "target-companies" && (r.source?.toLowerCase().includes("career") || r.source?.toLowerCase().includes("company")));
    return matchSearch && matchStatus && matchSource;
  });

  const sourceCounts = {
    all: roles.length,
    jobBoards: roles.filter(r => r.source?.toLowerCase().includes("rss") || r.source?.toLowerCase().includes("feed") || r.source?.toLowerCase().includes("indeed") || r.source?.toLowerCase().includes("linkedin")).length,
    targetCompanies: roles.filter(r => r.source?.toLowerCase().includes("career") || r.source?.toLowerCase().includes("company")).length,
  };

  const weekStats = {
    discovered: roles.filter(r => {
      const createdDate = new Date(r.created_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate >= weekAgo;
    }).length,
    applied: roles.filter(r => r.status === "applied").length,
    interviews: 0
  };

  return (
    <div className="px-4 sm:px-6 py-8 lg:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Open Roles</h1>
          <p className="text-gray-600">All matching jobs from target companies, job boards, and daily discoveries.</p>
        </div>

        {/* Weekly Stats */}
        <details open className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <summary className="cursor-pointer text-sm font-semibold text-gray-900">
            This week: {weekStats.discovered} roles discovered, {weekStats.applied} applied, {weekStats.interviews} interviews
          </summary>
        </details>

        {/* Search & Filter Bar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAISearch()}
                placeholder="Search roles, companies..."
                className="pl-10 rounded-xl"
              />
            </div>
            <Button
              onClick={handleAISearch}
              disabled={isSearching}
              className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl gap-2"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isSearching ? "Searching..." : "Find Roles"}
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New (unreviewed)</SelectItem>
                <SelectItem value="saved">Saved</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="not_interested">Not Interested</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source Filter Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-px">
            <button
              onClick={() => setSourceFilter("all")}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
                sourceFilter === "all"
                  ? "text-[#FF9E4D] bg-[#FFF9F5] border-b-2 border-[#FF9E4D]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              All Sources ({sourceCounts.all})
            </button>
            <button
              onClick={() => setSourceFilter("job-boards")}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
                sourceFilter === "job-boards"
                  ? "text-[#FF9E4D] bg-[#FFF9F5] border-b-2 border-[#FF9E4D]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Job Boards ({sourceCounts.jobBoards})
            </button>
            <button
              onClick={() => setSourceFilter("target-companies")}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
                sourceFilter === "target-companies"
                  ? "text-[#FF9E4D] bg-[#FFF9F5] border-b-2 border-[#FF9E4D]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Target Companies ({sourceCounts.targetCompanies})
            </button>
            <button
              onClick={() => setSourceFilter("discoveries")}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
                sourceFilter === "discoveries"
                  ? "text-[#FF9E4D] bg-[#FFF9F5] border-b-2 border-[#FF9E4D]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Daily Discoveries
            </button>
          </div>
        </div>

        {/* Roles List */}
        {filtered.length === 0 && !isLoading ? (
          sourceFilter === "all" ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No open roles yet</h3>
              <p className="text-gray-600 mb-6">Start by adding target companies or connecting job boards to begin discovering opportunities.</p>
              <div className="flex justify-center gap-3">
                <Link to={createPageUrl("Companies")}>
                  <Button className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl">
                    Find Companies →
                  </Button>
                </Link>
                <Link to={createPageUrl("JobBoards")}>
                  <Button variant="outline" className="rounded-xl">
                    Add Job Boards →
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No roles from {sourceFilter === "job-boards" ? "job boards" : "target companies"} yet</h3>
              <p className="text-gray-600 mb-6">Your {sourceFilter === "job-boards" ? "job board feeds haven't" : "target companies haven't"} found matching roles. Try expanding your search criteria or adding more {sourceFilter === "job-boards" ? "feeds" : "companies"}.</p>
              <Link to={createPageUrl("Settings")}>
                <Button variant="outline" className="rounded-xl">
                  Edit Job Search Preferences →
                </Button>
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {filtered.map(role => (
            <div key={role.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 flex-1">
                  {role.match_score && (
                    <div className="px-3 py-1.5 bg-[#FF9E4D]/10 text-[#FF9E4D] rounded-lg text-sm font-bold shrink-0">
                      {role.match_score}% Match
                    </div>
                  )}
                  {role.status === "new" && (
                    <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold">
                      New
                    </div>
                  )}
                </div>
                {role.status === "not_interested" && (
                  <span className="text-sm text-gray-400 font-medium">Not Interested</span>
                )}
              </div>

              {/* Role Info */}
              <div className="mb-4">
                <Link to={createPageUrl("CompanyDetail") + `?id=${role.company_id || role.company_name}`} className="hover:underline">
                  <h3 className="font-bold text-gray-900 text-xl mb-2">{role.title}</h3>
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    <Link to={createPageUrl("CompanyDetail") + `?id=${role.company_id || role.company_name}`} className="hover:underline font-medium">
                      {role.company_name}
                    </Link>
                  </span>
                  {role.industry && <span>• {role.industry}</span>}
                  {role.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {role.location}
                    </span>
                  )}
                </div>
                {(role.salary_min || role.salary_max || role.work_type || role.reports_to) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-gray-700">
                    {(role.salary_min || role.salary_max) && (
                      <span className="flex items-center gap-1 font-medium">
                        <DollarSign className="w-4 h-4" />
                        ${role.salary_min?.toLocaleString()} - ${role.salary_max?.toLocaleString()}
                      </span>
                    )}
                    {role.work_type && <span>• {role.work_type}</span>}
                    {role.reports_to && <span>• Reports to {role.reports_to}</span>}
                  </div>
                )}
              </div>

              {/* Match Explanation */}
              {(role.match_reasons || []).length > 0 && role.match_score >= 80 && (
                <details open className="mb-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-900 flex items-center justify-between mb-2">
                    Why it matches:
                    <span className="text-gray-400">▲</span>
                  </summary>
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <ul className="space-y-1.5">
                      {role.match_reasons.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="text-sm text-emerald-700 flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">✓</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}

              {/* Metadata Footer */}
              {(role.source || role.posted_date) && (
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
                  {role.source && (
                    <span>
                      <span className="font-semibold">Source:</span> {role.source}
                    </span>
                  )}
                  {role.posted_date && (
                    <span>Posted: {new Date(role.posted_date).toLocaleDateString()}</span>
                  )}
                </div>
              )}
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {role.status !== "applied" && (
                  <Button
                    size="sm"
                    className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl gap-1.5"
                    onClick={() => applyMutation.mutate(role)}
                    disabled={applyMutation.isPending}
                  >
                    Apply Now
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5"
                  onClick={() => saveJobMutation.mutate(role.id)}
                  disabled={saveJobMutation.isPending}
                >
                  <Bookmark className="w-4 h-4" /> {saveJobMutation.isPending ? "Saving..." : "Save to Pipeline"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl gap-1.5 text-gray-400 hover:text-red-500"
                  onClick={() => updateRoleMutation.mutate({ id: role.id, data: { status: "not_interested" } })}
                >
                  <X className="w-4 h-4" /> Not Interested
                </Button>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}