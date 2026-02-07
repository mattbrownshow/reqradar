import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Rss, Plus, Play, Pause, Trash2, ExternalLink,
  Clock, Check, X, Settings, Loader2, RefreshCw,
  Signal, Target, ArrowLeft
} from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import { format } from "date-fns";

export default function DiscoverySources() {
  const queryClient = useQueryClient();
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeed, setNewFeed] = useState({ feed_url: "", feed_name: "", refresh_frequency: "every_4_hours" });

  const { data: feeds = [], isLoading: feedsLoading } = useQuery({
    queryKey: ["feeds"],
    queryFn: () => base44.entities.RSSFeed.list("-created_date", 50),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["openRoles"],
    queryFn: () => base44.entities.OpenRole.list("-created_date", 200),
  });

  const { data: profile } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: async () => {
      const profiles = await base44.entities.CandidateProfile.list();
      return profiles[0];
    },
  });

  // Auto-create default feeds if none exist
  React.useEffect(() => {
    if (!feedsLoading && feeds.length === 0) {
      base44.functions.invoke('createDefaultFeeds', {}).then(() => {
        queryClient.invalidateQueries({ queryKey: ["feeds"] });
      }).catch(err => console.error('Failed to create default feeds:', err));
    }
  }, [feedsLoading, feeds.length, queryClient]);

  const jobBoardRoles = roles.filter(r => r.source && r.source !== "Company Career Page" && r.status !== "not_interested");
  const rolesNeedingReview = jobBoardRoles.filter(r => r.status === "new");

  const createFeedMutation = useMutation({
    mutationFn: (data) => base44.entities.RSSFeed.create({ ...data, status: "active", jobs_found: 0, last_updated: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
      setShowAddFeed(false);
      setNewFeed({ feed_url: "", feed_name: "", refresh_frequency: "every_4_hours" });
    }
  });

  const deleteFeedMutation = useMutation({
    mutationFn: (id) => base44.entities.RSSFeed.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feeds"] }),
  });

  const toggleFeedMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RSSFeed.update(id, { status: status === "active" ? "paused" : "active" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feeds"] }),
  });

  const updateRoleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.OpenRole.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["openRoles"] }),
  });

  return (
    <div className="px-4 sm:px-6 py-8 lg:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl("Discover")} className="inline-flex items-center gap-2 text-[#FF9E4D] hover:underline mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Discovery Engine
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discovery Sources</h1>
          <p className="text-gray-600">Configure and manage external job board feeds to automatically pull relevant job postings into your "Active Opportunities" list.</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Card 1: Active Monitoring */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-start">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <Signal className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Auto-discovery active</h3>
            <p className="text-sm text-gray-600 mb-4">Monitoring {feeds.length} job boards for {profile?.target_roles?.[0] || "your target roles"}</p>
          </div>

          {/* Card 2: New Roles */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-start">
            <div className="w-12 h-12 bg-[#FF9E4D]/10 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-[#FF9E4D]" />
            </div>
            {rolesNeedingReview.length > 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{rolesNeedingReview.length} new role{rolesNeedingReview.length > 1 ? "s" : ""}</h3>
                <p className="text-sm text-gray-600 mb-4">Found overnight matching your target profile</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No new roles this week</h3>
                <p className="text-sm text-gray-600 mb-4">We're monitoring {feeds.length} sources daily. New matches will appear here automatically.</p>
              </>
            )}
          </div>

          {/* Card 3: Feed Management */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-start">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              <Settings className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Manage your feeds</h3>
            <p className="text-sm text-gray-600 mb-4">Add RSS feeds or connect job board APIs</p>
            <Button onClick={() => setShowAddFeed(true)} className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl gap-2 mt-auto">
              <Plus className="w-4 h-4" />
              Add Feed
            </Button>
          </div>
        </div>

        {/* Info banner for loading */}
        {feedsLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-700">Setting up default RSS feeds...</p>
            </div>
          </div>
        )}

        <Tabs defaultValue="postings">
          <TabsList className="bg-gray-100 rounded-xl p-1">
            <TabsTrigger value="postings" className="rounded-lg data-[state=active]:bg-white">
              Job Postings ({rolesNeedingReview.length})
            </TabsTrigger>
            <TabsTrigger value="rss" className="rounded-lg data-[state=active]:bg-white">
              Open RSS Feeds ({feeds.length})
            </TabsTrigger>
            <TabsTrigger value="apis" className="rounded-lg data-[state=active]:bg-white">
              Open Job APIs (9)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="postings" className="mt-6 space-y-4">
            {rolesNeedingReview.length === 0 ? (
              <EmptyState
                icon={Rss}
                title="No new roles this week"
                description={`We're monitoring ${feeds.length} sources daily. New matches will appear here automatically.`}
              />
            ) : (
              rolesNeedingReview.map(role => (
              <div key={role.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{role.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {role.company_name} | {role.location} | Source: {role.source}
                    </p>
                    {(role.salary_min || role.salary_max) && (
                      <p className="text-sm text-gray-600 mt-1">
                        ${role.salary_min?.toLocaleString()} - ${role.salary_max?.toLocaleString()}
                      </p>
                    )}
                    {role.match_reasons && role.match_reasons.length > 0 && (
                      <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                        <p className="text-xs font-semibold text-emerald-900 mb-1.5">Why it matches:</p>
                        <ul className="space-y-1">
                          {role.match_reasons.slice(0, 3).map((reason, idx) => (
                            <li key={idx} className="text-xs text-emerald-700 flex items-start gap-1.5">
                              <span className="text-emerald-500 mt-0.5">✓</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <StatusBadge status={role.status || "new"} />
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="rounded-lg text-xs gap-1.5"
                    onClick={() => updateRoleStatusMutation.mutate({ id: role.id, status: "saved" })}
                  >
                    <Check className="w-3 h-3" /> Relevant
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="rounded-lg text-xs gap-1.5 text-gray-400 hover:text-red-500"
                    onClick={() => updateRoleStatusMutation.mutate({ id: role.id, status: "not_interested" })}
                  >
                    <X className="w-3 h-3" /> Not Relevant
                  </Button>
                  {role.source_url && (
                    <a href={role.source_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1.5">
                        <ExternalLink className="w-3 h-3" /> View Job
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="rss" className="mt-6 space-y-4">
          {feeds.length === 0 ? (
            <EmptyState
              icon={Rss}
              title="No RSS feeds configured"
              description="Add RSS feeds from job boards like Indeed, LinkedIn, etc."
              actionLabel="Add RSS Feed"
              onAction={() => setShowAddFeed(true)}
            />
          ) : (
            feeds.map(feed => (
              <div key={feed.id} className="bg-white border border-gray-100 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                      <Rss className="w-5 h-5 text-[#F7931E]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{feed.feed_name || "Untitled Feed"}</h4>
                      <p className="text-xs text-gray-400 mt-0.5 break-all">{feed.feed_url}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <StatusBadge status={feed.status || "active"} />
                        {feed.last_updated && <span>Updated: {format(new Date(feed.last_updated), "MMM d, h:mm a")}</span>}
                        <span>{feed.jobs_found || 0} jobs found</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => toggleFeedMutation.mutate({ id: feed.id, status: feed.status })}
                    >
                      {feed.status === "active" ? <Pause className="w-4 h-4 text-gray-400" /> : <Play className="w-4 h-4 text-emerald-500" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => deleteFeedMutation.mutate(feed.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="apis" className="mt-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Open Job APIs</h3>
            <p className="text-sm text-gray-600">
              These APIs provide free access to job listings. Backend integration coming soon.
            </p>
          </div>

          {[
            { name: "Remotive", url: "https://remotive.com/api/remote-jobs", description: "Remote job listings API" },
            { name: "Arbeitnow", url: "https://www.arbeitnow.com/api/job-board-api", description: "Job board API with multiple sources" },
            { name: "USAJobs API", url: "https://developer.usajobs.gov/", description: "Federal government jobs" },
            { name: "Adzuna API", url: "https://developer.adzuna.com/", description: "Job search API with free tier" },
            { name: "The Muse", url: "https://www.themuse.com/developers/api/v2", description: "Career content and job listings" },
            { name: "JSearch (RapidAPI)", url: "https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch", description: "Job search aggregator" },
            { name: "SerpAPI", url: "https://serpapi.com/google-jobs-api", description: "Google Jobs scraping API" },
            { name: "Serper", url: "https://serper.dev/", description: "Google search API with job results" },
            { name: "Apify Job Scrapers", url: "https://apify.com/store/categories/jobs", description: "Various job board scrapers" }
          ].map((api, idx) => (
            <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{api.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{api.description}</p>
                    <a href={api.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                      {api.url}
                    </a>
                  </div>
                </div>
                <div className="shrink-0 px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-full">
                  Coming Soon
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
        </Tabs>

        {/* Add Feed Modal */}
        <Dialog open={showAddFeed} onOpenChange={setShowAddFeed}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New RSS Feed</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Feed URL</Label>
                <Input value={newFeed.feed_url} onChange={e => setNewFeed(p => ({ ...p, feed_url: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="https://www.indeed.com/rss?q=CFO&l=Seattle" />
              </div>
              <div>
                <Label>Feed Name (optional)</Label>
                <Input value={newFeed.feed_name} onChange={e => setNewFeed(p => ({ ...p, feed_name: e.target.value }))} className="mt-1.5 rounded-xl" placeholder="Indeed - CFO Jobs" />
              </div>
              <div>
                <Label>Refresh Frequency</Label>
                <RadioGroup value={newFeed.refresh_frequency} onValueChange={v => setNewFeed(p => ({ ...p, refresh_frequency: v }))} className="mt-2 space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50">
                    <RadioGroupItem value="hourly" />
                    <span className="text-sm">Every hour</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50">
                    <RadioGroupItem value="every_4_hours" />
                    <span className="text-sm">Every 4 hours (recommended)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50">
                    <RadioGroupItem value="daily" />
                    <span className="text-sm">Daily</span>
                  </label>
                </RadioGroup>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setShowAddFeed(false)}>Cancel</Button>
                <Button className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl" onClick={() => createFeedMutation.mutate(newFeed)} disabled={!newFeed.feed_url || createFeedMutation.isPending}>
                  Add Feed
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}