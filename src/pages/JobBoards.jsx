import React, { useState } from "react";
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
  Clock, Check, X, AlertCircle, Loader2
} from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import { format } from "date-fns";

export default function JobBoards() {
  const queryClient = useQueryClient();
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeed, setNewFeed] = useState({ feed_url: "", feed_name: "", refresh_frequency: "every_4_hours" });

  const { data: feeds = [], isLoading: feedsLoading } = useQuery({
    queryKey: ["feeds"],
    queryFn: () => base44.entities.RSSFeed.list("-created_date", 50),
  });

  // Auto-create default feeds if none exist
  React.useEffect(() => {
    if (!feedsLoading && feeds.length === 0) {
      base44.functions.invoke('createDefaultFeeds', {}).then(() => {
        queryClient.invalidateQueries({ queryKey: ["feeds"] });
      }).catch(err => console.error('Failed to create default feeds:', err));
    }
  }, [feedsLoading, feeds.length, queryClient]);

  const { data: roles = [] } = useQuery({
    queryKey: ["openRoles"],
    queryFn: () => base44.entities.OpenRole.list("-created_date", 200),
  });

  const jobBoardRoles = roles.filter(r => r.source && r.source !== "Company Career Page");

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

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Job Boards</h1>
          <p className="text-sm text-gray-500 mt-1">
            {feeds.length === 0 && !feedsLoading 
              ? "No RSS feeds configured yet" 
              : `Monitoring ${feeds.length} RSS feed${feeds.length !== 1 ? 's' : ''} for executive opportunities`}
          </p>
        </div>
        <Button onClick={() => setShowAddFeed(true)} className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add RSS Feed
        </Button>
      </div>
      
      {/* Info banner for loading */}
      {feedsLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-700">Setting up default RSS feeds...</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="postings">
        <TabsList className="bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="postings" className="rounded-lg data-[state=active]:bg-white">
            Job Postings ({jobBoardRoles.length})
          </TabsTrigger>
          <TabsTrigger value="feeds" className="rounded-lg data-[state=active]:bg-white">
            RSS Feeds ({feeds.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="mt-6 space-y-4">
          {jobBoardRoles.length === 0 ? (
            <EmptyState
              icon={Rss}
              title="No job board postings"
              description="Add RSS feeds to start monitoring job postings, or search for roles from the Open Roles page."
            />
          ) : (
            jobBoardRoles.map(role => (
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
                    {role.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{role.description}</p>
                    )}
                  </div>
                  <StatusBadge status={role.status || "new"} />
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
                  <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1.5">
                    <Check className="w-3 h-3" /> Relevant
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg text-xs gap-1.5 text-gray-400">
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

        <TabsContent value="feeds" className="mt-6 space-y-4">
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
  );
}