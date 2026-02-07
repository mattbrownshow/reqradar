import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Building2, MapPin, Users, TrendingUp, Plus, X, Loader2, Play, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function DailySuggestions() {
  const [filter, setFilter] = useState("new");
  const queryClient = useQueryClient();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["suggestions", filter],
    queryFn: async () => {
      const allSuggestions = await base44.entities.SuggestedCompany.list("-suggested_at");
      if (filter === "new") {
        return allSuggestions.filter(s => s.status === "new");
      }
      return allSuggestions;
    }
  });

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

  const newCount = suggestions.filter(s => s.status === "new").length;
  const lastRun = runs[0];

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#F7931E]" />
            Daily Recommendations
          </h1>
          <p className="text-sm text-gray-600 mt-2 max-w-3xl">Discover new companies tailored to your job search preferences, even before they post specific roles. Review and decide which ones to add to your target list.</p>
        </div>
        <Link to={createPageUrl("Companies")}>
          <Button variant="outline" className="rounded-xl gap-2">
            <Building2 className="w-4 h-4" /> View Target List
          </Button>
        </Link>
        <Button
          onClick={() => runDiscoveryMutation.mutate()}
          disabled={runDiscoveryMutation.isPending}
          className="bg-[#F7931E] hover:bg-[#E07A0A] rounded-xl gap-2"
        >
          {runDiscoveryMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
          ) : (
            <><Play className="w-4 h-4" /> Run Discovery Now</>
          )}
        </Button>
      </div>

      {lastRun && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Last Run</p>
              <p className="font-medium">{new Date(lastRun.run_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#F7931E]">{lastRun.companies_found}</p>
                <p className="text-xs text-gray-500">Companies</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{lastRun.jobs_found}</p>
                <p className="text-xs text-gray-500">Jobs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{lastRun.career_pages_scanned}</p>
                <p className="text-xs text-gray-500">Scanned</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant={filter === "new" ? "default" : "outline"}
          onClick={() => setFilter("new")}
          className="rounded-xl"
        >
          New ({newCount})
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className="rounded-xl"
        >
          All ({suggestions.length})
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#F7931E] animate-spin" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No suggestions yet</h3>
          <p className="text-gray-500">Run discovery or check back tomorrow for fresh recommendations</p>
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