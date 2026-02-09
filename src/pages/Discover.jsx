import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Building2, MapPin, Users, TrendingUp, Plus, X, Loader2, Play, CheckCircle, Check,
  Search, Star, ArrowUpRight, Trash2, Grid3X3, List, Briefcase, DollarSign, Clock, Settings
} from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Discover() {
  const [activeTab, setActiveTab] = useState("high-match");
  const [targetRole, setTargetRole] = useState("target role");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState([]);
  const [showDiscoveryResults, setShowDiscoveryResults] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedFunding, setSelectedFunding] = useState([]);
  
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

  // Fetch and filter opportunities (roles) by user profile
  const { data: allRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["openRoles"],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke("filterJobsByUserProfile", {});
        return result.data.categorized.all || [];
      } catch (error) {
        console.error('Filter error:', error);
        // Fallback to unfiltered list
        return await base44.entities.OpenRole.list("-match_score", 200);
      }
    },
  });

  // Fetch suggested companies
  const { data: suggestedCompanies = [] } = useQuery({
    queryKey: ["suggestions"],
    queryFn: async () => await base44.entities.SuggestedCompany.list("-suggested_at")
  });

  // Fetch target companies
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ tracked: true }),
  });

  // Fetch discovery runs
  const { data: runs = [] } = useQuery({
    queryKey: ["discoveryRuns"],
    queryFn: () => base44.entities.DiscoveryRun.list("-run_at", 5)
  });

  const runDiscoveryMutation = useMutation({
    mutationFn: () => base44.functions.invoke("runDailyDiscovery", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["discoveryRuns"] });
      queryClient.invalidateQueries({ queryKey: ["openRoles"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
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

  const handleDiscoverCompanies = async () => {
    setIsSearching(true);
    try {
      const response = await base44.functions.invoke('discoverCompanies', {
        industries: selectedIndustries.length > 0 ? selectedIndustries : profile?.industries || [],
        companySizes: selectedSizes.length > 0 ? selectedSizes : profile?.company_sizes || [],
        fundingStages: selectedFunding.length > 0 ? selectedFunding : profile?.funding_stages || [],
        locations: profile?.preferred_locations || [],
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
      setDiscoveryResults(prev => prev.filter(c => c.lushaId !== companyData.lushaId));
      toast.success(`${companyData.name} added to your target list`);
    } catch (error) {
      console.error('Add error:', error);
      toast.error('Failed to add company');
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

  const lastRun = runs[0];

  // Filter opportunities based on active tab
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Show all role matches (backend already filters by role)
  const allOpportunities = allRoles.filter(r => r.status !== "not_interested");
  const highMatchOpportunities = allOpportunities.filter(r => r.match_score >= 88);
  const newThisWeek = allOpportunities.filter(r => {
    const createdDate = new Date(r.created_date);
    return createdDate >= weekAgo;
  });

  const currentOpportunities = activeTab === "all" ? allOpportunities
    : activeTab === "high-match" ? highMatchOpportunities
    : activeTab === "new-week" ? newThisWeek
    : [];

  // Filter companies
  const industries = [...new Set(companies.map(c => c.industry).filter(Boolean))];
  const filteredCompanies = companies.filter(c => {
    const matchSearch = !searchTerm || c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchIndustry = industryFilter === "all" || c.industry === industryFilter;
    return matchSearch && matchIndustry;
  });

  return (
    <div className="px-4 sm:px-6 py-8 lg:py-12">
      <style>{`
        .discover-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #E5E5E5;
          overflow-x: auto;
          margin-bottom: 32px;
        }
        
        .discover-tab {
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
        
        .discover-tab:hover {
          color: #1A1A1A;
        }
        
        .discover-tab.active {
          color: #FF9E4D;
          border-bottom-color: #FF9E4D;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discovery Engine</h1>
          <p className="text-gray-600">
            Opportunities automatically surfaced overnight matching your <strong>{targetRole}</strong> profile
          </p>
        </div>

        {/* Last Run Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {lastRun ? (
              <>
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
              </>
            ) : (
              <span className="text-gray-600">No discovery runs yet</span>
            )}
          </div>
          <Button onClick={() => runDiscoveryMutation.mutate()} disabled={runDiscoveryMutation.isPending} className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl gap-2 shrink-0">
            {runDiscoveryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Discovery Now
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="discover-tabs">
          <button
            className={`discover-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Opportunities ({allOpportunities.length})
          </button>
          <button
            className={`discover-tab ${activeTab === "high-match" ? "active" : ""}`}
            onClick={() => setActiveTab("high-match")}
          >
            High Match ({highMatchOpportunities.length})
          </button>
          <button
            className={`discover-tab ${activeTab === "new-week" ? "active" : ""}`}
            onClick={() => setActiveTab("new-week")}
          >
            New This Week ({newThisWeek.length})
          </button>

        </div>

        {/* Tab Content */}
        <OpportunitiesTabContent
          opportunities={currentOpportunities}
          loading={rolesLoading}
          emptyMessage={
            activeTab === "all"
              ? "No opportunities discovered yet"
              : activeTab === "high-match"
              ? "No high-match opportunities yet"
              : "No new opportunities this week"
          }
          emptyDescription={
            activeTab === "all"
              ? "Run discovery to scan job boards and RSS feeds for roles matching your target profile."
              : activeTab === "high-match"
              ? "High-match roles will appear here when discovery finds 88%+ alignment."
              : "We're monitoring sources daily. New matches will appear here automatically."
          }
          profile={profile}
        />
      </div>
    </div>
  );
}

function OpportunitiesTabContent({ opportunities, loading, emptyMessage, emptyDescription, profile }) {
  const queryClient = useQueryClient();

  const saveJobMutation = useMutation({
    mutationFn: (job_id) => 
      base44.functions.invoke("saveJobToPipeline", { job_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobPipeline"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Job saved to pipeline");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save job");
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OpenRole.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["openRoles"] }),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#FF9E4D] animate-spin" />
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="mb-6">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto">
            <circle cx="32" cy="32" r="30" stroke="#E5E5E5" strokeWidth="4"/>
            <path d="M32 20v24M20 32h24" stroke="#9CA3AF" strokeWidth="4" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-3">{emptyMessage}</h3>
        <p className="text-gray-600 mb-8 leading-relaxed">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {opportunities.map(role => (
        <OpportunityCard
          key={role.id}
          role={role}
          onSave={() => saveJobMutation.mutate(role.id)}
          onNotInterested={() => updateRoleMutation.mutate({ id: role.id, data: { status: "not_interested" } })}
          isSaving={saveJobMutation.isPending}
        />
      ))}
    </div>
  );
}

function OpportunityCard({ role, onSave, onNotInterested, isSaving }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
      {/* Match Score & Status */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1">
          {role.match_score && (
            <div className="px-3 py-1.5 bg-[#FF9E4D]/10 text-[#FF9E4D] rounded-lg text-sm font-bold">
              {role.match_score}% Match
            </div>
          )}
          {role.status === "new" && (
            <Badge className="bg-blue-50 text-blue-700">New</Badge>
          )}
        </div>
      </div>

      {/* Role Details */}
      <div className="mb-4">
        <Link to={createPageUrl("CompanyDetail") + `?id=${role.company_id || role.company_name}`}>
          <h3 className="font-bold text-gray-900 text-xl mb-2 hover:text-[#FF9E4D]">{role.title}</h3>
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            {role.company_name}
          </span>
          {role.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {role.location}
            </span>
          )}
          {(role.salary_min || role.salary_max) && (
            <span className="flex items-center gap-1 font-medium">
              <DollarSign className="w-4 h-4" />
              ${role.salary_min?.toLocaleString()} - ${role.salary_max?.toLocaleString()}
            </span>
          )}
          {role.work_type && <span>• {role.work_type}</span>}
        </div>
      </div>

      {/* Match Reasons */}
      {role.match_reasons && role.match_reasons.length > 0 && (
        <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
          <h4 className="text-sm font-semibold text-emerald-900 mb-2">Why this matches:</h4>
          <ul className="space-y-1">
            {role.match_reasons.slice(0, 3).map((reason, idx) => (
              <li key={idx} className="text-sm text-emerald-700 flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata */}
      {(role.source || role.posted_date) && (
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
          {role.source && <span>Source: {role.source}</span>}
          {role.posted_date && <span>Posted: {new Date(role.posted_date).toLocaleDateString()}</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl flex-1"
          onClick={onSave}
          disabled={isSaving}
        >
          Add to Pipeline
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={onNotInterested}
        >
          Not Interested
        </Button>
      </div>
    </div>
  );
}

function TargetCompaniesTabContent({
  companies, searchTerm, setSearchTerm, industryFilter, setIndustryFilter, industries,
  viewMode, setViewMode, profile, isSearching, discoveryResults, showDiscoveryResults,
  setShowDiscoveryResults, handleDiscoverCompanies, handleAddToTargetList, handleRemoveFromTarget,
  selectedIndustries, setSelectedIndustries, selectedSizes, setSelectedSizes,
  selectedFunding, setSelectedFunding
}) {
  return (
    <>
      {/* Description */}
      <div className="mb-6">
        <p className="text-gray-600">
          Search for companies matching your profile. When you add a company, we automatically scan for your desired roles and find decision maker contacts.
        </p>
      </div>

      {/* Company Discovery - Collapsible */}
      <details className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <summary className="cursor-pointer flex items-center justify-between list-none">
          <h2 className="text-xl font-semibold text-gray-900">Discover More Companies</h2>
        </summary>
        
        <div className="mt-6 space-y-4">
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
              className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl gap-2"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Find Companies
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={selectedIndustries[0] || "all"} onValueChange={v => setSelectedIndustries(v === "all" ? [] : [v])}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Any industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any industry</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedSizes[0] || "all"} onValueChange={v => setSelectedSizes(v === "all" ? [] : [v])}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Any size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any size</SelectItem>
                <SelectItem value="1-50">1-50 employees</SelectItem>
                <SelectItem value="51-200">51-200 employees</SelectItem>
                <SelectItem value="201-1000">201-1000 employees</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedFunding[0] || "all"} onValueChange={v => setSelectedFunding(v === "all" ? [] : [v])}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Any stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any stage</SelectItem>
                <SelectItem value="Seed">Seed</SelectItem>
                <SelectItem value="Series A">Series A</SelectItem>
                <SelectItem value="Series B">Series B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </details>

      {/* Discovery Results */}
      {showDiscoveryResults && discoveryResults.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Found {discoveryResults.length} Matching Companies</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowDiscoveryResults(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {discoveryResults.map((company, idx) => (
              <DiscoveryCompanyCard key={idx} company={company} onAdd={handleAddToTargetList} />
            ))}
          </div>
        </div>
      )}

      {/* Your Target Companies */}
      {companies.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No target companies yet</h3>
          <p className="text-gray-600">Use the discovery tool above to find and add companies to your target list.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Target Companies ({companies.length})</h2>
            <div className="flex items-center gap-3">
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
              
              <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode("grid")} 
                  className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-[#FF9E4D] text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode("list")} 
                  className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-[#FF9E4D] text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {companies.map(company => (
                <TargetCompanyCard key={company.id} company={company} onRemove={handleRemoveFromTarget} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Company</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Industry</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Active Opportunities</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Decision Makers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {companies.map(company => (
                    <tr key={company.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link to={createPageUrl("CompanyDetail") + `?id=${company.id}`} className="font-medium text-gray-900 hover:text-[#FF9E4D]">
                          {company.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{company.industry}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{company.open_positions_count || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">0</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

function DiscoveryCompanyCard({ company, onAdd }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
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
      </div>

      <Button 
        size="sm"
        onClick={() => onAdd(company)}
        className="w-full bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-lg gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Add to Target List
      </Button>
    </div>
  );
}

function TargetCompanyCard({ company, onRemove }) {
  return (
    <Link
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
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            onRemove(company.id);
          }}
          className="text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {company.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            {company.location}
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-[#FF9E4D]" />
            <span className="font-medium">Active Opportunities: {company.open_positions_count || 0}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span className="font-medium">Decision Makers: 0</span>
        </div>
      </div>
    </Link>
  );
}