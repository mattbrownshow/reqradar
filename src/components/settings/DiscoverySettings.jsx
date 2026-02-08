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

  const { data: runs = [] } = useQuery({
    queryKey: ["discoveryRuns"],
    queryFn: () => base44.entities.DiscoveryRun.list("-run_at", 5)
  });

  // Auto-create default feeds automatically when profile exists
  React.useEffect(() => {
    if (!feedsLoading && feeds.length === 0 && profile?.id) {
      base44.functions.invoke('createDefaultFeeds', {}).then(() => {
        queryClient.invalidateQueries({ queryKey: ["feeds"] });
      }).catch(err => console.error('Failed to create default feeds:', err));
    }
  }, [feedsLoading, feeds.length, profile?.id, queryClient]);

  const runDiscoveryMutation = useMutation({
    mutationFn: () => base44.functions.invoke("runDailyDiscovery", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["discoveryRuns"] });
      queryClient.invalidateQueries({ queryKey: ["openRoles"] });
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
    mutationFn: ({ id, status }) => base44.entities.RSSFeed.update(id, { status: status === "active" ? "paused" : "active" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feeds"] }),
  });

  const jobBoardRoles = roles.filter(r => r.source && r.source !== "Company Career Page" && r.status !== "not_interested");
  const lastRun = runs[0];

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

      {/* RSS Feed Management */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Discovery Sources</h3>
            <p className="text-sm text-gray-500">Manage RSS feeds and job board monitoring</p>
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

        {feeds.length === 0 && !feedsLoading ? (
          <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-xl">
            <Rss className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No RSS feeds configured</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feeds.map(feed => (
              <div key={feed.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                      <Rss className="w-5 h-5 text-[#F7931E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm">{feed.feed_name || "Untitled Feed"}</h4>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{feed.feed_url}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={feed.status || "active"} />
                        <span className="text-xs text-gray-500">{feed.jobs_found || 0} jobs found</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
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
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Monitoring {feeds.filter(f => f.status === "active").length} active sources • {jobBoardRoles.length} opportunities found
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