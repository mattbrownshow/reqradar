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
    <div className="px-4 sm:px-6 py-8 lg:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Outreach</h1>
            <p className="text-gray-600">Generate personalized messages to CEOs and decision makers at your target companies.</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Create Outreach
          </Button>
        </div>

        {/* Email Integration Banner */}
        {!emailConnected && queued > 0 && (
          <EmailIntegrationBanner onConnect={handleConnectEmail} />
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="text-4xl mb-3">⏱️</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{queued}</div>
            <div className="text-sm text-gray-500 border-t border-gray-100 pt-2 mt-2">
              {queued > 0 ? "Messages drafted and ready to send" : "—"}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="text-4xl mb-3">✈️</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{sent}</div>
            <div className="text-sm text-gray-500 border-t border-gray-100 pt-2 mt-2">
              {sent > 0 ? "Messages sent to decision makers" : "—"}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="text-4xl mb-3">✓</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{delivered}</div>
            <div className="text-sm text-gray-500 border-t border-gray-100 pt-2 mt-2">
              {delivered > 0 ? "Successfully delivered to inbox" : "—"}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="text-4xl mb-3">👁️</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{opened}</div>
            <div className="text-sm text-gray-500 border-t border-gray-100 pt-2 mt-2">
              {opened > 0 ? "Recipients who opened your message" : "—"}
            </div>
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="flex gap-3 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="responded">Replied</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Messages */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
            <div className="text-6xl mb-6">📧</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No outreach messages</h3>
            <p className="text-gray-600 mb-8">Create outreach campaigns to engage with decision makers.</p>
            <Button onClick={() => setShowCreate(true)} className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl">
              Create Outreach
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(msg => (
              <div key={msg.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
                {/* Message Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {msg.contact_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{msg.contact_name}</h3>
                    <p className="text-sm text-gray-600">{msg.contact_title}, {msg.company_name}</p>
                  </div>
                  <StatusBadge status={msg.status || "draft"} />
                </div>

                {/* Message Preview */}
                <div className="mb-4">
                  <p className="text-gray-700 italic line-clamp-2">
                    "{msg.body?.substring(0, 100) || msg.subject || "No message content"}..."
                  </p>
                </div>

                {/* Message Metadata */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
                  <span>Status: <strong>{msg.status || "draft"}</strong></span>
                  {msg.sent_at && (
                    <>
                      <span>•</span>
                      <span>Sent: {msg.sent_at}</span>
                    </>
                  )}
                  {msg.opened_at && (
                    <>
                      <span>•</span>
                      <span>Opened: {msg.opened_at}</span>
                    </>
                  )}
                  {msg.created_date && !msg.sent_at && (
                    <>
                      <span>•</span>
                      <span>Created: {format(new Date(msg.created_date), "MMM d, h:mm a")}</span>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl gap-1.5">
                    View Message
                  </Button>
                  {(msg.status === "sent" || msg.status === "delivered" || msg.status === "opened") && (
                    <Button size="sm" variant="outline" className="rounded-xl gap-1.5">
                      Follow Up
                    </Button>
                  )}
                  {msg.status === "sent" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl gap-1.5"
                      onClick={() => updateMutation.mutate({ id: msg.id, data: { status: "responded" } })}
                    >
                      Mark as Replied
                    </Button>
                  )}
                  {msg.status === "draft" && (
                    <Button
                      size="sm"
                      className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl gap-1.5"
                      onClick={() => updateMutation.mutate({ id: msg.id, data: { status: "queued" } })}
                    >
                      <Send className="w-3 h-3" /> Queue for Review
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Create Outreach Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {/* Step 1: Recipients */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Who are you reaching out to?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Contact Name" value={newOutreach.contact_name} onChange={e => setNewOutreach(p => ({ ...p, contact_name: e.target.value }))} className="rounded-xl" />
                  <Input placeholder="Contact Title (e.g., CEO)" value={newOutreach.contact_title} onChange={e => setNewOutreach(p => ({ ...p, contact_title: e.target.value }))} className="rounded-xl" />
                </div>
                <Input placeholder="Company Name" value={newOutreach.company_name} onChange={e => setNewOutreach(p => ({ ...p, company_name: e.target.value }))} className="rounded-xl mt-3" />
              </div>

              {/* Step 2: Template & Channel */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Message template</h3>
                <div className="flex gap-3">
                  <Select value={newOutreach.template_type} onValueChange={v => setNewOutreach(p => ({ ...p, template_type: v }))}>
                    <SelectTrigger className="rounded-xl flex-1">
                      <SelectValue placeholder="Select template approach" />
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
                <Button variant="outline" className="rounded-xl gap-2 w-full mt-3" onClick={handleGenerate} disabled={generating || !newOutreach.contact_name || !newOutreach.company_name}>
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  {generating ? "Generating..." : "Generate AI Message"}
                </Button>
              </div>

              {/* Step 3: Compose */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Compose your message</h3>
                <Input placeholder="Subject line" value={newOutreach.subject} onChange={e => setNewOutreach(p => ({ ...p, subject: e.target.value }))} className="rounded-xl mb-3" />
                <Textarea 
                  placeholder="Message body..." 
                  value={newOutreach.body} 
                  onChange={e => setNewOutreach(p => ({ ...p, body: e.target.value }))} 
                  className="rounded-xl min-h-[250px]" 
                />
                <p className="text-xs text-gray-500 mt-2 flex items-start gap-2">
                  <span>💡</span>
                  <span>Tip: Personalization significantly improves response rates</span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <Button variant="outline" className="rounded-xl" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-xl" onClick={() => createMutation.mutate({ ...newOutreach, status: "draft" })} disabled={createMutation.isPending || !newOutreach.contact_name}>
                  Queue for Review →
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}