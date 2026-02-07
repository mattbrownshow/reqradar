import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2, MapPin, DollarSign, Briefcase, ExternalLink,
  Search, Settings, Check, X, Clock
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

export default function OpenRoles() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match");

  const { data: openRoles = [], isLoading } = useQuery({
    queryKey: ["openRoles"],
    queryFn: () => base44.entities.OpenRole.list("-match_score", 200),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OpenRole.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openRoles"] });
      toast.success("Role updated");
    },
  });

  const saveRoleMutation = useMutation({
    mutationFn: async (role) => {
      await base44.entities.OpenRole.update(role.id, { status: "saved" });
      await base44.entities.JobPipeline.create({
        job_id: role.id,
        company_id: role.company_id,
        stage: "saved",
        saved_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openRoles"] });
      queryClient.invalidateQueries({ queryKey: ["jobPipeline"] });
      toast.success("Saved for later");
    },
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
      toast.success("Application submitted");
    },
  });

  const handleNotInterested = (role) => {
    updateRoleMutation.mutate({ id: role.id, data: { status: "not_interested" } });
  };

  const handleSaveRole = (role) => {
    if (role.status === "saved") return;
    saveRoleMutation.mutate(role);
  };

  const handleApply = (role) => {
    applyMutation.mutate(role);
  };

  let filtered = openRoles.filter(role => {
    const matchSearch = !searchTerm || 
      role.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || role.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Sort roles
  if (sortBy === "match") {
    filtered = filtered.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  } else if (sortBy === "recent") {
    filtered = filtered.sort((a, b) => new Date(b.posted_date || b.created_date) - new Date(a.posted_date || a.created_date));
  } else if (sortBy === "salary") {
    filtered = filtered.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
  }

  return (
    <div className="px-4 sm:px-6 py-8 lg:py-12">
      <style>{`
        .roles-container {
          max-width: 900px;
          margin: 0 auto;
        }
        
        .match-breakdown {
          background: #F9FAFB;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        }
        
        .breakdown-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #6B7280;
          margin-bottom: 12px;
          display: block;
        }
        
        .breakdown-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .breakdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #1A1A1A;
        }
        
        .role-source {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #6B7280;
          padding-top: 16px;
          border-top: 1px solid #E5E5E5;
          flex-wrap: wrap;
        }
        
        .source-label {
          font-weight: 600;
        }
        
        .feed-footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #E5E5E5;
          text-align: center;
        }
      `}</style>
      
      <div className="roles-container">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Open Roles</h1>
          <p className="text-gray-600 mb-4">All matching jobs from target companies, job boards, and daily discoveries.</p>
          <Link 
            to={createPageUrl("Settings")} 
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#FF9E4D] text-[#FF9E4D] rounded-xl font-semibold text-sm hover:bg-[#FFF9F5] transition-colors"
          >
            <Settings className="w-4 h-4" />
            Adjust Search Preferences
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search roles, companies..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="saved">Saved</SelectItem>
              <SelectItem value="not_interested">Not Interested</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[200px] rounded-xl">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match">Sort by: Match %</SelectItem>
              <SelectItem value="recent">Recently Posted</SelectItem>
              <SelectItem value="salary">Salary (High to Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Roles Feed */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading roles...</div>
        ) : filtered.length === 0 ? (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="mb-6">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto">
                <rect x="16" y="16" width="32" height="32" rx="4" stroke="#E5E5E5" strokeWidth="3"/>
                <path d="M24 28h16M24 36h12" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">No roles found</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Try adjusting your search preferences or adding more companies to your target list.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to={createPageUrl("Settings")}>
                <Button variant="outline" className="rounded-xl">Adjust Preferences</Button>
              </Link>
              <Link to={createPageUrl("Companies")}>
                <Button variant="outline" className="rounded-xl">Browse Companies</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map(role => (
              <div
                key={role.id}
                className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-[#FF9E4D] hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    {role.status === "new" && (
                      <Badge className="bg-blue-100 text-blue-700 mb-2 font-semibold uppercase text-xs">New</Badge>
                    )}
                  </div>
                  {role.match_score && (
                    <div className="text-3xl font-bold text-[#50C878]">{role.match_score}%</div>
                  )}
                </div>
                
                <div className="mb-3">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">{role.title}</h3>
                  <div className="flex items-center gap-2 text-gray-600">
                    {role.company_name && (
                      <>
                        <Building2 className="w-4 h-4" />
                        <span className="font-medium">{role.company_name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-4">
                  {(role.salary_min || role.salary_max) && (
                    <>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {role.salary_min && role.salary_max
                          ? `$${(role.salary_min / 1000).toFixed(0)}K - $${(role.salary_max / 1000).toFixed(0)}K`
                          : role.salary_max
                          ? `Up to $${(role.salary_max / 1000).toFixed(0)}K`
                          : `From $${(role.salary_min / 1000).toFixed(0)}K`}
                      </div>
                      <span className="text-gray-300">•</span>
                    </>
                  )}
                  {role.work_type && (
                    <>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {role.work_type}
                      </div>
                      <span className="text-gray-300">•</span>
                    </>
                  )}
                  {role.reports_to && (
                    <span>Reports to {role.reports_to}</span>
                  )}
                </div>

                {role.match_reasons && role.match_reasons.length > 0 && (
                  <div className="match-breakdown">
                    <span className="breakdown-label">Match breakdown:</span>
                    <div className="breakdown-items">
                      {role.match_reasons.slice(0, 3).map((reason, idx) => (
                        <div key={idx} className="breakdown-item">
                          <Check className="w-4 h-4 text-[#50C878] flex-shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <Button
                    onClick={() => handleApply(role)}
                    disabled={applyMutation.isPending || role.status === "applied"}
                    className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl font-semibold"
                  >
                    {role.status === "applied" ? "Applied" : "Quick Apply"}
                  </Button>
                  <Button
                    onClick={() => handleSaveRole(role)}
                    disabled={saveRoleMutation.isPending || role.status === "saved"}
                    variant="outline"
                    className="border-2 border-[#FF9E4D] text-[#FF9E4D] hover:bg-[#FFF9F5] rounded-xl font-semibold"
                  >
                    {role.status === "saved" ? "Saved" : "Save for Later"}
                  </Button>
                  <Button
                    onClick={() => handleNotInterested(role)}
                    variant="outline"
                    disabled={updateRoleMutation.isPending}
                    className="border-2 border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 rounded-xl font-semibold"
                  >
                    Not a Fit
                  </Button>
                </div>
                
                <div className="role-source">
                  <span className="source-label">Source:</span>
                  {role.source_url ? (
                    <a 
                      href={role.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#FF9E4D] font-semibold hover:underline"
                    >
                      {role.source_type === "career_page" ? "Company Career Page" : 
                       role.source_type === "rss_feed" ? "Job Board" : "Manual Entry"}
                    </a>
                  ) : (
                    <span>{role.source_type === "career_page" ? "Company Career Page" : 
                           role.source_type === "rss_feed" ? "Job Board" : "Manual Entry"}</span>
                  )}
                  {role.posted_date && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-400">
                        Posted {format(new Date(role.posted_date), "MM/dd/yyyy")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Footer */}
        <div className="feed-footer">
          <p className="text-gray-600 mb-3">Looking for something different?</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Link to={createPageUrl("Settings")} className="text-[#FF9E4D] font-semibold hover:underline text-sm">
              Adjust Search Preferences
            </Link>
            <span className="text-gray-300">•</span>
            <Link to={createPageUrl("Companies")} className="text-[#FF9E4D] font-semibold hover:underline text-sm">
              Browse All Companies
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}