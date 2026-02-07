import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Send, Mail, Linkedin, Clock, Eye, MessageSquare,
  Plus, Check, Copy, Search, Loader2, ArrowUpRight
} from "lucide-react";
import MetricCard from "../components/shared/MetricCard";
import StatusBadge from "../components/shared/StatusBadge";
import EmptyState from "../components/shared/EmptyState";
import EmailIntegrationBanner from "../components/outreach/EmailIntegrationBanner";
import { format } from "date-fns";

export default function Outreach() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [emailConnected, setEmailConnected] = useState(false); // TODO: Check actual integration status
  const [newOutreach, setNewOutreach] = useState({
    contact_name: "", contact_title: "", company_name: "",
    subject: "", body: "", channel: "email", template_type: ""
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => base44.entities.OutreachMessage.list("-created_date", 200),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-match_score", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OutreachMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach"] });
      setShowCreate(false);
      setNewOutreach({ contact_name: "", contact_title: "", company_name: "", subject: "", body: "", channel: "email", template_type: "" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OutreachMessage.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outreach"] }),
  });

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a professional outreach email to ${newOutreach.contact_name}, ${newOutreach.contact_title} at ${newOutreach.company_name}.
      Template approach: ${newOutreach.template_type || "Hiring Pain Point"}
      
      Write a compelling, personalized email. Consultative tone, not salesy. Include a clear CTA.`,
      response_json_schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string" }
        }
      }
    });
    setNewOutreach(prev => ({ ...prev, subject: result.subject, body: result.body }));
    setGenerating(false);
  };

  const handleConnectEmail = () => {
    alert('Email integration coming soon! For now, copy/paste messages manually.');
    // TODO: Implement OAuth flow for Gmail/Outlook
  };

  const queued = messages.filter(m => m.status === "queued" || m.status === "draft").length;
  const sent = messages.filter(m => ["sent", "delivered", "opened", "responded"].includes(m.status)).length;
  const delivered = messages.filter(m => ["delivered", "opened", "responded"].includes(m.status)).length;
  const opened = messages.filter(m => ["opened", "responded"].includes(m.status)).length;

  const filtered = messages.filter(m => statusFilter === "all" || m.status === statusFilter);

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Outreach</h1>
          <p className="text-sm text-gray-500 mt-2">Generate personalized outreach to decision makers at your target companies.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Create Outreach
        </Button>
      </div>

      {/* Email Integration Banner */}
      {!emailConnected && queued > 0 && (
        <EmailIntegrationBanner onConnect={handleConnectEmail} />
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Clock} title="Queued" value={queued} subtitle={queued > 0 ? "Ready to send" : "—"} bgColor="bg-yellow-50" iconColor="text-yellow-600" />
        <MetricCard icon={Send} title="Sent" value={sent} bgColor="bg-blue-50" iconColor="text-blue-500" />
        <MetricCard icon={Check} title="Delivered" value={delivered} bgColor="bg-indigo-50" iconColor="text-indigo-500" />
        <MetricCard icon={Eye} title="Opened" value={opened} bgColor="bg-purple-50" iconColor="text-purple-500" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="opened">Opened</SelectItem>
            <SelectItem value="responded">Responded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Messages */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No outreach messages"
          description="Launch outreach campaigns to engage with decision makers."
          actionLabel="Create Outreach"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map(msg => (
            <div key={msg.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <span className="font-medium text-gray-900">To: {msg.contact_name}</span>
                    {msg.contact_title && <span>({msg.contact_title})</span>}
                    <span>at {msg.company_name}</span>
                  </div>
                  <h4 className="font-medium text-gray-900">{msg.subject || "No subject"}</h4>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {msg.channel && (
                      <span className="flex items-center gap-1">
                        {msg.channel === "email" ? <Mail className="w-3 h-3" /> : <Linkedin className="w-3 h-3" />}
                        {msg.channel}
                      </span>
                    )}
                    {msg.sent_at && <span>Sent {msg.sent_at}</span>}
                    {msg.created_date && <span>{format(new Date(msg.created_date), "MMM d, yyyy")}</span>}
                  </div>
                </div>
                <StatusBadge status={msg.status || "draft"} />
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
                {msg.body && (
                  <Button size="sm" variant="outline" className="rounded-lg gap-1.5 text-xs" onClick={() => navigator.clipboard.writeText(msg.body)}>
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                )}
                {msg.status === "draft" && (
                  <Button
                    size="sm"
                    className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-lg gap-1.5 text-xs"
                    onClick={() => updateMutation.mutate({ id: msg.id, data: { status: "queued" } })}
                  >
                    <Send className="w-3 h-3" /> Queue
                  </Button>
                )}
                {msg.status === "sent" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg gap-1.5 text-xs"
                    onClick={() => updateMutation.mutate({ id: msg.id, data: { status: "responded" } })}
                  >
                    <MessageSquare className="w-3 h-3" /> Mark Responded
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Outreach Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Contact Name" value={newOutreach.contact_name} onChange={e => setNewOutreach(p => ({ ...p, contact_name: e.target.value }))} className="rounded-xl" />
              <Input placeholder="Contact Title" value={newOutreach.contact_title} onChange={e => setNewOutreach(p => ({ ...p, contact_title: e.target.value }))} className="rounded-xl" />
            </div>
            <Input placeholder="Company Name" value={newOutreach.company_name} onChange={e => setNewOutreach(p => ({ ...p, company_name: e.target.value }))} className="rounded-xl" />
            <div className="flex gap-3">
              <Select value={newOutreach.template_type} onValueChange={v => setNewOutreach(p => ({ ...p, template_type: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Template type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hiring_pain_point">Hiring Pain Point</SelectItem>
                  <SelectItem value="leadership_gap">Leadership Gap</SelectItem>
                  <SelectItem value="growth_scaling">Growth Scaling</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newOutreach.channel} onValueChange={v => setNewOutreach(p => ({ ...p, channel: v }))}>
                <SelectTrigger className="w-[140px] rounded-xl">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="rounded-xl gap-2 w-full" onClick={handleGenerate} disabled={generating || !newOutreach.contact_name || !newOutreach.company_name}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
              {generating ? "Generating..." : "Generate AI Message"}
            </Button>
            <Input placeholder="Subject" value={newOutreach.subject} onChange={e => setNewOutreach(p => ({ ...p, subject: e.target.value }))} className="rounded-xl" />
            <Textarea placeholder="Message body..." value={newOutreach.body} onChange={e => setNewOutreach(p => ({ ...p, body: e.target.value }))} className="rounded-xl min-h-[200px]" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl" onClick={() => createMutation.mutate({ ...newOutreach, status: "draft" })} disabled={createMutation.isPending}>
                Create Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}