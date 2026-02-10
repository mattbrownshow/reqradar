import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Rss, Plus, Play, Pause, Trash2, Loader2, Signal, Target, ExternalLink, Clock
} from "lucide-react";
import StatusBadge from "../shared/StatusBadge";
import { format } from "date-fns";

export default function DiscoverySettings() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .feed-card {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 24px;
        background: white;
        border: 1px solid #E5E5E5;
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .feed-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .feed-details {
        flex: 1;
      }

      .feed-details h3 {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 4px 0;
        color: #1a1a1a;
      }

      .feed-url {
        font-size: 14px;
        color: #666;
        margin: 0 0 12px 0;
        word-break: break-all;
      }

      .feed-stats {
        display: flex;
        gap: 16px;
        align-items: center;
        font-size: 14px;
      }

      .status-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-weight: 500;
        font-size: 13px;
      }

      .status-active {
        background: #E8F5E9;
        color: #2E7D32;
      }

      .status-paused {
        background: #FFF3E0;
        color: #E65100;
      }

      .status-error {
        background: #FFEBEE;
        color: #C62828;
      }

      .last-checked,
      .jobs-found {
        color: #666;
      }

      .feed-actions {
        display: flex;
        gap: 8px;
        flex-direction: column;
      }

      .feed-actions button {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        border: 1px solid #E5E5E5;
        background: white;
        color: #333;
      }

      .feed-actions button:hover {
        background: #F5F5F5;
      }

      .feed-actions button.danger {
        color: #C62828;
        border-color: #FFEBEE;
      }

      .feed-actions button.danger:hover {
        background: #FFEBEE;
      }

      .monitoring-summary {
        margin-top: 16px;
        padding: 16px;
        background: #F5F5F5;
        border-radius: 6px;
        font-size: 14px;
        color: #666;
      }

      .empty-state {
        text-align: center;
        padding: 48px 24px;
        color: #666;
      }

      .empty-state p:first-child {
        font-size: 18px;
        color: #333;
        margin-bottom: 8px;
      }

      .api-source-card {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 20px;
        background: #FAFAFA;
        border: 1px solid #E5E5E5;
        border-radius: 8px;
      }

      .api-icon {
        font-size: 32px;
        flex-shrink: 0;
      }

      .api-info {
        flex: 1;
      }

      .api-info h3 {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 4px 0;
        color: #1a1a1a;
      }

      .api-description {
        font-size: 14px;
        color: #666;
        margin: 0 0 12px 0;
      }

      .api-meta {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 13px;
      }

      .meta-item {
        color: #666;
      }

      .status-inactive {
        background: #F5F5F5;
        color: #666;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeed, setNewFeed] = useState({ feed_url: "", feed_name: "", refresh_frequency: "every_4_hours" });

  // Get ALL feeds - don't filter by status
  const { data: feeds = [], isLoading: feedsLoading } = useQuery({
    queryKey: ["feeds"],
    queryFn: () => base44.entities.RSSFeed.list("-created_date"),
  });

  // Sort by created date descending
  const sortedFeeds = feeds.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Calculate total jobs found
  const totalJobsFound = sortedFeeds.reduce((sum, feed) => sum + (feed.jobs_found || 0), 0);

  const { data: roles = [] } = useQuery({
    queryKey: ["openRoles"],
    queryFn: () => base44.entities.OpenRole.list("-created_date", 200),
  });

  const { data: profile } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const profiles = await base44.entities.CandidateProfile.list();
      return profiles.find(p => p.created_by === user.email);
    },
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["discoveryRuns"],
    queryFn: () => base44.entities.DiscoveryRun.list("-run_at", 5)
  });



  const runDiscoveryMutation = useMutation({
    mutationFn: () => base44.functions.invoke("runDiscovery", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["discoveryRuns"] });
      queryClient.invalidateQueries({ queryKey: ["openRoles"] });
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
    }
  });

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
    mutationFn: ({ id, status }) => base44.entities.RSSFeed.update(id, { status: status === "paused" ? "active" : "paused" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feeds"] }),
  });

  const jobBoardRoles = roles.filter(r => r.source && r.source !== "Company Career Page" && r.status !== "not_interested");
  const lastRun = runs[0];

  // All API keys are configured (from existing_secrets)
  const hasAdzunaKey = true;
  const hasSerpAPIKey = true;
  const hasSerperKey = true;

  // Helper to count jobs per source
  const getJobsFoundBySource = (sourceName) => {
    return roles.filter(r => r.source && r.source.includes(sourceName)).length;
  };

  return (
    <div className="space-y-6">
      {/* Discovery Controls */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Discovery Engine</h3>
          <p className="text-sm text-gray-500">Manually trigger the overnight discovery process</p>
        </div>

        {lastRun && (
          <div className="p-4 bg-gray-50 rounded-xl text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-600 font-semibold">Last run:</span>
              <span className="text-gray-900">{format(new Date(lastRun.run_at), "M/d/yyyy, h:mm a")}</span>
              <span className="text-gray-300">•</span>
              <span className="font-semibold text-[#FF9E4D]">{lastRun.companies_found}</span>
              <span className="text-gray-600">Companies</span>
              <span className="text-gray-300">•</span>
              <span className="font-semibold text-[#FF9E4D]">{lastRun.jobs_found}</span>
              <span className="text-gray-600">Jobs</span>
            </div>
          </div>
        )}

        <Button
          onClick={() => runDiscoveryMutation.mutate()}
          disabled={runDiscoveryMutation.isPending}
          className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl gap-2"
        >
          {runDiscoveryMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Running Discovery...</>
          ) : (
            <><Play className="w-4 h-4" /> Run Discovery Now</>
          )}
        </Button>
      </div>

      {/* API Sources Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">API Sources</h3>
          <p className="text-sm text-gray-500">Job board APIs connected via your API keys</p>
        </div>

        <div className="grid gap-4">
          {/* Adzuna API */}
          <div className="api-source-card">
            <div className="api-icon">🔗</div>
            <div className="api-info">
              <h3>Adzuna</h3>
              <p className="api-description">Job search aggregator API</p>
              <div className="api-meta">
                <span className={`status-badge ${hasAdzunaKey ? 'status-active' : 'status-inactive'}`}>
                  {hasAdzunaKey ? '✅ Connected' : '⚠️ Not Connected'}
                </span>
                {hasAdzunaKey && lastRun && (
                  <>
                    <span className="meta-item">Last run: {format(new Date(lastRun.run_at), "MMM d, h:mm a")}</span>
                    <span className="meta-item">Jobs found: {getJobsFoundBySource('Adzuna')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SerpAPI */}
          <div className="api-source-card">
            <div className="api-icon">🔗</div>
            <div className="api-info">
              <h3>SerpAPI (Google Jobs)</h3>
              <p className="api-description">Google Jobs search via SerpAPI</p>
              <div className="api-meta">
                <span className={`status-badge ${hasSerpAPIKey ? 'status-active' : 'status-inactive'}`}>
                  {hasSerpAPIKey ? '✅ Connected' : '⚠️ Not Connected'}
                </span>
                {hasSerpAPIKey && lastRun && (
                  <>
                    <span className="meta-item">Last run: {format(new Date(lastRun.run_at), "MMM d, h:mm a")}</span>
                    <span className="meta-item">Jobs found: {getJobsFoundBySource('SerpAPI')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Serper API */}
          <div className="api-source-card">
            <div className="api-icon">🔗</div>
            <div className="api-info">
              <h3>Serper (Google Jobs)</h3>
              <p className="api-description">Google Jobs search via Serper</p>
              <div className="api-meta">
                <span className={`status-badge ${hasSerperKey ? 'status-active' : 'status-inactive'}`}>
                  {hasSerperKey ? '✅ Connected' : '⚠️ Not Connected'}
                </span>
                {hasSerperKey && lastRun && (
                  <>
                    <span className="meta-item">Last run: {format(new Date(lastRun.run_at), "MMM d, h:mm a")}</span>
                    <span className="meta-item">Jobs found: {getJobsFoundBySource('Serper')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RSS Feed Management */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">RSS Feeds</h3>
            <p className="text-sm text-gray-500">Custom RSS feeds and job boards</p>
          </div>
          <Button onClick={() => setShowAddFeed(true)} className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Add Feed
          </Button>
        </div>

        {feedsLoading && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-700">Setting up default RSS feeds...</p>
          </div>
        )}

        {sortedFeeds.length === 0 && !feedsLoading ? (
          <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-xl">
            <Rss className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600 mb-2">No RSS feeds configured</p>
            <p className="text-xs text-gray-500">Click "Add Feed" to start discovering jobs</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedFeeds.map(feed => {
              const statusDisplay = feed.status === "active" ? "✅ Active" : 
                                   feed.status === "error" ? "❌ Error" :
                                   feed.status === "paused" ? "⏸️ Paused" :
                                   (feed.jobs_found === 0 ? "⚠️ No Jobs Found" : "✅ Active");
              
              return (
                <div key={feed.id} className="feed-card">
                  <div className="feed-icon">📡</div>
                  
                  <div className="feed-details">
                    <h3>{feed.feed_name || "RSS Feed"}</h3>
                    <p className="feed-url">{feed.feed_url}</p>
                    
                    <div className="feed-stats">
                      <span className={`status-badge status-${feed.status}`}>
                        {statusDisplay}
                      </span>
                      
                      {feed.last_updated && (
                        <span className="last-checked">
                          Last checked: {format(new Date(feed.last_updated), "MMM d, h:mm a")}
                        </span>
                      )}
                      
                      <span className="jobs-found">
                        Jobs found: {feed.jobs_found || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div className="feed-actions">
                    <button
                      onClick={() => toggleFeedMutation.mutate({ id: feed.id, status: feed.status })}
                      disabled={toggleFeedMutation.isPending}
                    >
                      {feed.status === "paused" ? "Resume" : "Pause"}
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        if (confirm(`Delete this RSS feed?\n\n${feed.feed_url}\n\nThis action cannot be undone.`)) {
                          deleteFeedMutation.mutate(feed.id);
                        }
                      }}
                      disabled={deleteFeedMutation.isPending}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Monitoring {sortedFeeds.length} {sortedFeeds.length === 1 ? 'source' : 'sources'} for {profile?.target_roles?.join(', ') || 'your target roles'} • {totalJobsFound} opportunities found
          </p>
        </div>
      </div>

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
  );
}