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
  Building2, Search, MapPin, Users, DollarSign,
  Briefcase, Plus, Grid3X3, List, Star, ArrowUpRight, Loader2
} from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import JobPreferencesCard from "../components/shared/JobPreferencesCard";

export default function Companies() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [isSearching, setIsSearching] = useState(false);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-match_score", 200),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: () => base44.entities.CandidateProfile.list("-created_date", 1),
  });

  const handleAISearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    const profile = profiles[0] || {};
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a list of 8 real companies matching this search: "${searchTerm}". 
      Candidate prefers industries: ${(profile.industries || []).join(", ") || "any"}.
      Target roles: ${(profile.target_roles || []).join(", ") || "executive"}.
      Location preferences: ${(profile.preferred_locations || []).join(", ") || "any"}.
      
      Return realistic company data with real company names that exist.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          companies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                domain: { type: "string" },
                industry: { type: "string" },
                employee_count: { type: "number" },
                revenue_estimate: { type: "string" },
                location: { type: "string" },
                description: { type: "string" },
                match_score: { type: "number" },
                open_positions_count: { type: "number" },
                funding_stage: { type: "string" }
              }
            }
          }
        }
      }
    });
    if (result.companies) {
      await base44.entities.Company.bulkCreate(
        result.companies.map(c => ({ ...c, pipeline_stage: "research", tracked: true }))
      );
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    }
    setIsSearching(false);
  };

  const industries = [...new Set(companies.map(c => c.industry).filter(Boolean))];

  const filtered = companies.filter(c => {
    const matchSearch = !searchTerm || c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchIndustry = industryFilter === "all" || c.industry === industryFilter;
    return matchSearch && matchIndustry;
  });

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Companies</h1>
          <p className="text-sm text-gray-500 mt-1">{companies.length} companies in your target list</p>
        </div>
        <JobPreferencesCard />
      </div>

      {/* Search & AI Find */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Find Target Companies</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAISearch()}
              placeholder="Search by name, industry, or keywords..."
              className="pl-10 rounded-xl"
            />
          </div>
          <Button
            onClick={handleAISearch}
            disabled={isSearching}
            className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2 shrink-0"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {isSearching ? "Searching..." : "Find Companies"}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {industries.map(ind => (
                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}>
              <Grid3X3 className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}>
              <List className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Company Grid/List */}
      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Search for companies above to start building your target list."
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(company => (
            <Link
              key={company.id}
              to={createPageUrl("CompanyDetail") + `?id=${company.id}`}
              className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-orange-100 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-lg font-bold text-gray-600 group-hover:bg-orange-50 group-hover:text-[#F7931E] transition-colors">
                    {company.match_score || "–"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-[#F7931E] transition-colors">{company.name}</h3>
                    {company.industry && <p className="text-xs text-gray-500">{company.industry}</p>}
                  </div>
                </div>
                <StatusBadge status={company.pipeline_stage || "research"} />
              </div>

              <div className="space-y-2 text-sm text-gray-500">
                {company.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {company.location}
                  </div>
                )}
                <div className="flex items-center gap-4">
                  {company.employee_count && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {company.employee_count}
                    </div>
                  )}
                  {company.revenue_estimate && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      {company.revenue_estimate}
                    </div>
                  )}
                </div>
                {company.open_positions_count > 0 && (
                  <div className="flex items-center gap-1.5 text-[#F7931E] font-medium">
                    <Briefcase className="w-3.5 h-3.5" />
                    {company.open_positions_count} open positions
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Score</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Company</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">Industry</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">Location</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">Size</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(company => (
                <tr key={company.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-sm font-bold text-[#F7931E]">
                      {company.match_score || "–"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={createPageUrl("CompanyDetail") + `?id=${company.id}`} className="font-medium text-gray-900 hover:text-[#F7931E]">
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-500">{company.industry}</td>
                  <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-500">{company.location}</td>
                  <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-500">{company.employee_count}</td>
                  <td className="px-6 py-4"><StatusBadge status={company.pipeline_stage || "research"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}