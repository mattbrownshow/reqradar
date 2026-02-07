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

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Open Roles</h1>
        <p className="text-sm text-gray-600 mt-2 max-w-3xl">Explore current job openings from various sources that match your profile. Apply directly or save roles to your pipeline for future action.</p>
      </div>

      {/* Search */}
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
            className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {isSearching ? "Searching..." : "Find Roles"}
          </Button>
        </div>

        {/* Source Tabs */}
        <div className="flex gap-2 border-b-2 border-gray-200 -mb-px">
          <button
            onClick={() => setSourceFilter("all")}
            className={`px-5 py-3 text-sm font-medium transition-all -mb-0.5 border-b-3 ${
              sourceFilter === "all"
                ? "text-[#F7931E] border-b-[#F7931E]"
                : "text-gray-600 border-b-transparent hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            All Sources ({sourceCounts.all})
          </button>
          <button
            onClick={() => setSourceFilter("job-boards")}
            className={`px-5 py-3 text-sm font-medium transition-all -mb-0.5 border-b-3 ${
              sourceFilter === "job-boards"
                ? "text-[#F7931E] border-b-[#F7931E]"
                : "text-gray-600 border-b-transparent hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Job Boards ({sourceCounts.jobBoards})
          </button>
          <button
            onClick={() => setSourceFilter("target-companies")}
            className={`px-5 py-3 text-sm font-medium transition-all -mb-0.5 border-b-3 ${
              sourceFilter === "target-companies"
                ? "text-[#F7931E] border-b-[#F7931E]"
                : "text-gray-600 border-b-transparent hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Target Companies ({sourceCounts.targetCompanies})
          </button>
        </div>

        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="saved">Saved</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="not_interested">Not Interested</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Roles List */}
      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={Briefcase}
          title="No roles found"
          description="Search for executive opportunities above to discover matching roles."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map(role => (
            <div key={role.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    {role.match_score && (
                      <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-sm font-bold text-[#F7931E] shrink-0">
                        {role.match_score}%
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{role.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {role.company_name}</span>
                        {role.industry && <span>• {role.industry}</span>}
                        {role.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {role.location}</span>}
                      </div>
                      {(role.salary_min || role.salary_max) && (
                        <p className="flex items-center gap-1 mt-2 text-sm font-medium text-gray-700">
                          <DollarSign className="w-3.5 h-3.5" />
                          ${role.salary_min?.toLocaleString()} - ${role.salary_max?.toLocaleString()}
                          {role.work_type && <span className="text-gray-400 font-normal ml-2">• {role.work_type}</span>}
                          {role.reports_to && <span className="text-gray-400 font-normal ml-2">• Reports to {role.reports_to}</span>}
                        </p>
                      )}
                      {(role.match_reasons || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {role.match_reasons.map((reason, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                              <Check className="w-3 h-3" /> {reason}
                            </span>
                          ))}
                        </div>
                      )}
                      {role.source && (
                        <div className="flex items-center gap-2 mt-3 text-xs">
                          <span className="font-semibold text-gray-600">Source:</span>
                          <span className={`px-2.5 py-1 rounded font-medium ${
                            role.source?.toLowerCase().includes("rss") || role.source?.toLowerCase().includes("feed") || role.source?.toLowerCase().includes("indeed") || role.source?.toLowerCase().includes("linkedin")
                              ? "bg-amber-50 text-amber-800"
                              : "bg-blue-50 text-blue-800"
                          }`}>
                            {role.source}
                          </span>
                          {role.posted_date && (
                            <span className="text-gray-500 ml-auto">
                              Posted: {new Date(role.posted_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={role.status || "new"} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                {role.status !== "applied" && (
                  <Button
                    size="sm"
                    className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-lg gap-1.5 text-xs"
                    onClick={() => applyMutation.mutate(role)}
                    disabled={applyMutation.isPending}
                  >
                    <Check className="w-3 h-3" /> Apply Now
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg gap-1.5 text-xs"
                  onClick={() => saveJobMutation.mutate(role.id)}
                  disabled={saveJobMutation.isPending}
                >
                  <Bookmark className="w-3 h-3" /> {saveJobMutation.isPending ? "Saving..." : "Save to Pipeline"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg gap-1.5 text-xs text-gray-400"
                  onClick={() => updateRoleMutation.mutate({ id: role.id, data: { status: "not_interested" } })}
                >
                  <X className="w-3 h-3" /> Not Interested
                </Button>
                {role.source_url && (
                  <a href={role.source_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="rounded-lg gap-1.5 text-xs">
                      <ExternalLink className="w-3 h-3" /> View Posting
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}