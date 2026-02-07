import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Building2, MapPin, Users, TrendingUp, Plus, X, Loader2, Play, CheckCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function DailySuggestions() {
  const [filter, setFilter] = useState("new-companies");
  const [targetRole, setTargetRole] = useState("target role");
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: async () => {
      const profiles = await base44.entities.CandidateProfile.list();
      return profiles[0];
    },
  });

  useEffect(() => {
    if (profile?.target_roles?.length > 0) {
      setTargetRole(profile.target_roles[0]);
    }
  }, [profile]);

  const { data: allSuggestions = [], isLoading } = useQuery({
    queryKey: ["suggestions"],
    queryFn: async () => await base44.entities.SuggestedCompany.list("-suggested_at")
  });

  const suggestions = allSuggestions.filter(s => {
    if (filter === "new-companies") return s.status === "new";
    if (filter === "new-roles") return s.jobs_found > 0;
    if (filter === "high-match") return s.match_score >= 85;
    return true;
  });

  const newCompaniesCount = allSuggestions.filter(s => s.status === "new").length;
  const newRolesCount = allSuggestions.filter(s => s.jobs_found > 0).length;
  const highMatchCount = allSuggestions.filter(s => s.match_score >= 85).length;

  const { data: runs = [] } = useQuery({
    queryKey: ["discoveryRuns"],
    queryFn: () => base44.entities.DiscoveryRun.list("-run_at", 5)
  });

  const runDiscoveryMutation = useMutation({
    mutationFn: () => base44.functions.invoke("runDailyDiscovery", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["discoveryRuns"] });
    }
  });

  const manageSuggestionMutation = useMutation({
    mutationFn: ({ suggestion_id, action }) => 
      base44.functions.invoke("manageSuggestions", { suggestion_id, action }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      if (variables.action === "add_to_target") {
        toast.success("Company added to your target list");
      }
    }
  });

  const lastRun = runs[0];

  return (
    <div className="px-4 sm:px-6 py-8 lg:py-12">
      <style>{`
        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 32px;
          border-bottom: 2px solid #E5E5E5;
          overflow-x: auto;
        }
        
        .tab {
          background: transparent;
          border: none;
          padding: 12px 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #6B7280;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .tab:hover {
          color: #1A1A1A;
        }
        
        .tab.active {
          color: #FF9E4D;
          border-bottom-color: #FF9E4D;
        }
        
        .preview-card {
          position: relative;
          margin: 32px 0;
        }
        
        .preview-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #4A90E2;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          z-index: 1;
        }
        
        .preview-company-card {
          background: white;
          border: 2px solid #E5E5E5;
          border-radius: 12px;
          padding: 24px;
          opacity: 0.6;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Discovery Engine</h1>
            <p className="text-gray-600">
              Companies found overnight matching your <strong>{targetRole}</strong> profile
            </p>
          </div>
          <Button
            onClick={() => runDiscoveryMutation.mutate()}
            disabled={runDiscoveryMutation.isPending}
            className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl gap-2"
          >
            {runDiscoveryMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
            ) : (
              <><Play className="w-4 h-4" /> Run Discovery Now</>
            )}
          </Button>
        </div>

        {lastRun && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-600 font-semibold">Last run:</span>
            <span className="text-gray-900">{format(new Date(lastRun.run_at), "M/d/yyyy, h:mm:ss a")}</span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold text-[#FF9E4D]">{lastRun.companies_found}</span>
            <span className="text-gray-600">Companies</span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold text-[#FF9E4D]">{lastRun.jobs_found}</span>
            <span className="text-gray-600">Jobs</span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold text-[#FF9E4D]">{lastRun.career_pages_scanned}</span>
            <span className="text-gray-600">Scanned</span>
          </div>
        )}

        <div className="filter-tabs">
          <button
            className={`tab ${filter === "new-companies" ? "active" : ""}`}
            onClick={() => setFilter("new-companies")}
          >
            🆕 New Companies ({newCompaniesCount})
          </button>
          <button
            className={`tab ${filter === "new-roles" ? "active" : ""}`}
            onClick={() => setFilter("new-roles")}
          >
            🆕 New Roles ({newRolesCount})
          </button>
          <button
            className={`tab ${filter === "high-match" ? "active" : ""}`}
            onClick={() => setFilter("high-match")}
          >
            💎 High Match ({highMatchCount})
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#FF9E4D] animate-spin" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="max-w-xl mx-auto text-center py-12">
            <div className="mb-6">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto">
                <circle cx="32" cy="32" r="30" stroke="#E5E5E5" strokeWidth="4"/>
                <path d="M32 20v24M20 32h24" stroke="#9CA3AF" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">No suggestions yet</h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Every night, we scan thousands of companies matching your target profile.<br />
              Run discovery or check back tomorrow for fresh recommendations.
            </p>
            
            <div className="preview-card">
              <div className="preview-badge">Example</div>
              <div className="preview-company-card">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FF9E4D] to-[#E8893D] rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    AC
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">Acme Corp</h4>
                    <p className="text-sm text-gray-600">Series B • 150 employees • Austin, TX</p>
                  </div>
                  <div className="text-2xl font-bold text-[#50C878]">88%</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-5">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Why this matches:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-[#50C878]" />
                      <span>Target role open</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-[#50C878]" />
                      <span>{profile?.industries?.[0] || "Industry"} alignment</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-[#50C878]" />
                      <span>{profile?.remote_preferences?.[0] || "Location"} preference match</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-[#FF9E4D] text-[#FF9E4D] hover:bg-[#FFF9F5]">
                    Add to Pipeline
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Not Interested
                  </Button>
                </div>
              </div>
            </div>

            <Button
              onClick={() => runDiscoveryMutation.mutate()}
              disabled={runDiscoveryMutation.isPending}
              className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl mt-6"
            >
              Run Discovery to See Real Companies
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAddToTarget={() => manageSuggestionMutation.mutate({ 
                  suggestion_id: suggestion.id, 
                  action: "add_to_target" 
                })}
                onDismiss={() => manageSuggestionMutation.mutate({ 
                  suggestion_id: suggestion.id, 
                  action: "dismiss" 
                })}
                isLoading={manageSuggestionMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion, onAddToTarget, onDismiss, isLoading }) {
  const company = suggestion.company_data || {};
  const matchReasons = suggestion.match_reasons || [];
  const jobs = suggestion.jobs_data || [];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-[#F7931E] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {suggestion.status === "new" && (
            <Badge className="bg-[#FEF3E2] text-[#F7931E] mb-2">🆕 NEW</Badge>
          )}
          <h3 className="text-xl font-bold text-gray-900 mb-1">{company.name}</h3>
          <p className="text-gray-500 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {company.industry || "N/A"}
            {company.location && (
              <>
                <span className="text-gray-300">•</span>
                <MapPin className="w-4 h-4" />
                {company.location}
              </>
            )}
          </p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#FEF3E2] flex items-center justify-center">
            <span className="text-xl font-bold text-[#F7931E]">{suggestion.match_score}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Match</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {company.employee_count && (
          <Badge variant="outline" className="rounded-lg">
            <Users className="w-3 h-3 mr-1" />
            {company.employee_count} employees
          </Badge>
        )}
        {company.funding_stage && (
          <Badge variant="outline" className="rounded-lg">
            <TrendingUp className="w-3 h-3 mr-1" />
            {company.funding_stage}
          </Badge>
        )}
        {company.revenue && (
          <Badge variant="outline" className="rounded-lg">
            ${(company.revenue / 1000000).toFixed(1)}M revenue
          </Badge>
        )}
      </div>

      {matchReasons.length > 0 && (
        <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
          <h4 className="text-sm font-semibold text-emerald-900 mb-2">Why it matches:</h4>
          <ul className="space-y-1">
            {matchReasons.map((reason, idx) => (
              <li key={idx} className="text-sm text-emerald-700 flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                {reason.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            {jobs.length} open role{jobs.length > 1 ? "s" : ""} found:
          </h4>
          <ul className="space-y-1">
            {jobs.slice(0, 3).map((job, idx) => (
              <li key={idx} className="text-sm text-blue-700">
                • {job.title}
                {job.salary_min && job.salary_max && 
                  ` - $${(job.salary_min / 1000).toFixed(0)}K-$${(job.salary_max / 1000).toFixed(0)}K`
                }
              </li>
            ))}
            {jobs.length > 3 && <li className="text-sm text-blue-600">+ {jobs.length - 3} more</li>}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={onAddToTarget}
          disabled={isLoading || suggestion.status === "added_to_target"}
          className={`flex-1 rounded-xl gap-2 ${
            suggestion.status === "added_to_target"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-[#F7931E] hover:bg-[#E07A0A] text-white"
          }`}
        >
          {suggestion.status === "added_to_target" ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Added to Target List
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add to Target List
            </>
          )}
        </Button>
        {suggestion.status === "new" && (
          <Button
            variant="outline"
            onClick={onDismiss}
            disabled={isLoading}
            className="rounded-xl gap-2"
          >
            <X className="w-4 h-4" />
            Not Interested
          </Button>
        )}
      </div>
    </div>
  );
}