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
  Briefcase, Plus, Grid3X3, List, Star, ArrowUpRight, Loader2, X, Trash2
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
  const [discoveryResults, setDiscoveryResults] = useState([]);
  const [showDiscoveryResults, setShowDiscoveryResults] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedFunding, setSelectedFunding] = useState([]);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ tracked: true }),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: () => base44.entities.CandidateProfile.list("-created_date", 1),
  });

  const handleDiscoverCompanies = async () => {
    setIsSearching(true);
    try {
      const profile = profiles[0] || {};
      const response = await base44.functions.invoke('discoverCompanies', {
        industries: selectedIndustries.length > 0 ? selectedIndustries : profile.industries || [],
        companySizes: selectedSizes.length > 0 ? selectedSizes : profile.company_sizes || [],
        fundingStages: selectedFunding.length > 0 ? selectedFunding : profile.funding_stages || [],
        locations: profile.preferred_locations || [],
        keywords: searchTerm
      });
      
      if (response.data.companies) {
        setDiscoveryResults(response.data.companies);
        setShowDiscoveryResults(true);
      }
    } catch (error) {
      console.error('Discovery error:', error);
    }
    setIsSearching(false);
  };

  const handleAddToTargetList = async (companyData) => {
    try {
      await base44.functions.invoke('addToTargetList', { companyData });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      // Remove from discovery results
      setDiscoveryResults(prev => prev.filter(c => c.lushaId !== companyData.lushaId));
    } catch (error) {
      console.error('Add error:', error);
    }
  };

  const handleRemoveFromTarget = async (companyId) => {
    try {
      await base44.entities.Company.update(companyId, { tracked: false });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    } catch (error) {
      console.error('Remove error:', error);
    }
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
          <p className="text-sm text-gray-600 mt-2 max-w-3xl">Manage your curated list of target companies. Track engagement and view overall company profiles. For specific job openings, check the "Open Roles" page.</p>
        </div>
        <JobPreferencesCard />
      </div>

      {/* Company Discovery */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Discover New Companies</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleDiscoverCompanies()}
              placeholder="Optional keywords..."
              className="pl-10 rounded-xl"
            />
          </div>
          <Button
            onClick={handleDiscoverCompanies}
            disabled={isSearching}
            className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2 shrink-0"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {isSearching ? "Searching..." : "Find Companies"}
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Industries</label>
            <Select value={selectedIndustries[0] || "all"} onValueChange={v => setSelectedIndustries(v === "all" ? [] : [v])}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Any industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any industry</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Company Size</label>
            <Select value={selectedSizes[0] || "all"} onValueChange={v => setSelectedSizes(v === "all" ? [] : [v])}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Any size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any size</SelectItem>
                <SelectItem value="1-50">1-50 employees</SelectItem>
                <SelectItem value="51-200">51-200 employees</SelectItem>
                <SelectItem value="201-1000">201-1000 employees</SelectItem>
                <SelectItem value="1000+">1000+ employees</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Funding Stage</label>
            <Select value={selectedFunding[0] || "all"} onValueChange={v => setSelectedFunding(v === "all" ? [] : [v])}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Any stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any stage</SelectItem>
                <SelectItem value="Seed">Seed</SelectItem>
                <SelectItem value="Series A">Series A</SelectItem>
                <SelectItem value="Series B">Series B</SelectItem>
                <SelectItem value="Series C+">Series C+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Discovery Results */}
      {showDiscoveryResults && discoveryResults.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Found {discoveryResults.length} Matching Companies</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowDiscoveryResults(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {discoveryResults.map((company, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                 {company.logoUrl ? (
                   <img src={company.logoUrl} alt={company.name} className="w-12 h-12 rounded-lg object-contain bg-gray-50" />
                 ) : (
                   <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">
                     {company.name.substring(0, 2).toUpperCase()}
                   </div>
                 )}
                 <div className="flex-1 min-w-0">
                   <h4 className="font-semibold text-gray-900 truncate">{company.name}</h4>
                   <div className="flex items-center gap-2 mt-1">
                     {company.matchScore && (
                       <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 rounded-full">
                         <Star className="w-3 h-3 text-[#F7931E] fill-[#F7931E]" />
                         <span className="text-xs font-semibold text-[#F7931E]">{company.matchScore}% match</span>
                       </div>
                     )}
                     {company.source && (
                       <span className="text-xs text-gray-400 capitalize">via {company.source}</span>
                     )}
                   </div>
                 </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600">
                 <div className="flex items-center gap-1.5">
                   <Building2 className="w-3.5 h-3.5 text-gray-400" />
                   <span>{company.industry || "Industry not specified"}</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <MapPin className="w-3.5 h-3.5 text-gray-400" />
                   <span>{company.location || "Location not specified"}</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <Users className="w-3.5 h-3.5 text-gray-400" />
                   <span>{company.employeeCount ? company.employeeCount.toLocaleString() + " employees" : "Size not specified"}</span>
                 </div>
                </div>

                {company.description && (
                 <p className="text-xs text-gray-500 line-clamp-2 mt-2">{company.description}</p>
                )}

                <Button 
                  size="sm"
                  onClick={() => handleAddToTargetList(company)}
                  className="w-full bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-lg gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to Target List
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your Target Companies */}
      {companies.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Your Target Companies ({companies.length})</h3>
          <div className="flex flex-wrap gap-3 items-center mb-4">
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
      )}

      {/* Target Companies Grid/List */}
      {companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No target companies yet"
          description="Use the discovery tool above to find and add companies to your target list."
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
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="w-12 h-12 rounded-xl object-contain bg-gray-50" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xs font-bold text-gray-400">
                      {company.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-[#F7931E] transition-colors">{company.name}</h3>
                    {company.industry && <p className="text-xs text-gray-500">{company.industry}</p>}
                    {company.pipeline_stage && (
                      <div className="mt-1">
                        <StatusBadge status={company.pipeline_stage} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {company.match_score && (
                    <div className="px-2 py-1 bg-orange-50 rounded-lg flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#F7931E] fill-[#F7931E]" />
                      <span className="text-xs font-semibold text-[#F7931E]">{company.match_score}%</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveFromTarget(company.id);
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {company.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{company.description}</p>
              )}

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
                      {company.employee_count.toLocaleString()}
                    </div>
                  )}
                  {company.funding_stage && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      {company.funding_stage}
                    </div>
                  )}
                </div>
                {company.open_positions_count > 0 && (
                  <div className="flex items-center gap-1.5 text-[#F7931E] font-medium">
                    <Briefcase className="w-3.5 h-3.5" />
                    {company.open_positions_count} open positions
                  </div>
                )}
                {company.domain && (
                  <a 
                    href={`https://${company.domain}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Visit website <ArrowUpRight className="w-3 h-3" />
                  </a>
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