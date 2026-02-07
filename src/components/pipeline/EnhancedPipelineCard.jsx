import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, DollarSign, ChevronDown, ChevronUp, Send, MessageSquare, Loader2 } from "lucide-react";
import DecisionMakersPanel from "./DecisionMakersPanel";
import OutreachStatusBar from "./OutreachStatusBar";
import ActivationSignals from "./ActivationSignals";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

export default function EnhancedPipelineCard({ item, job, onStatusChange, onLaunchOutreach }) {
  const [expanded, setExpanded] = useState(false);
  const [enrichedAt, setEnrichedAt] = useState(item.enriched_at);
  const queryClient = useQueryClient();

  const { data: company = [] } = useQuery({
    queryKey: ["company", job?.company_id],
    queryFn: () => base44.entities.Company.filter({ id: job?.company_id }),
    enabled: !!job?.company_id
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", job?.company_id],
    queryFn: () => base44.entities.Contact.filter({ company_id: job?.company_id }),
    enabled: !!job?.company_id
  });

  const { data: outreachMessages = [] } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => base44.entities.OutreachMessage.list("-created_date", 500)
  });

  // Enrichment removed - now happens on-demand on CompanyDetail page

  if (!job) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-500">Job not found</p>
      </div>
    );
  }

  const companyData = company?.[0];
  const relevantOutreach = outreachMessages.filter(m => 
    m.company_name === job.company_name && 
    m.status !== "draft"
  );
  
  const outreachStatus = relevantOutreach.length > 0 ? {
    status: relevantOutreach[relevantOutreach.length - 1]?.status || "draft",
    messagesCount: relevantOutreach.length,
    repliesCount: relevantOutreach.filter(m => m.status === "responded").length,
    lastContactDate: relevantOutreach[0]?.sent_at
  } : null;

  // Sort outreach by date for most recent first
  const sortedOutreach = [...relevantOutreach].sort((a, b) => 
    new Date(b.created_date || b.sent_at) - new Date(a.created_date || a.sent_at)
  );

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl hover:shadow-lg hover:border-[#FF9E4D] transition-all overflow-hidden">
      {/* Header */}
      <div className="p-4 space-y-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        {/* Company & Role */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-sm">{job.title}</h4>
              <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3" />
                {job.company_name}
              </p>
            </div>
            {job.match_score && (
              <div className="px-2 py-1 bg-orange-50 text-[#FF9E4D] rounded text-xs font-bold shrink-0">
                {Math.round(job.match_score)}%
              </div>
            )}
          </div>

          {/* Salary & Location */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
            {(job.salary_min || job.salary_max) && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${(job.salary_min / 1000).toFixed(0)}K - ${(job.salary_max / 1000).toFixed(0)}K
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {job.location}
              </span>
            )}
            {job.work_type && <span>• {job.work_type}</span>}
          </div>
        </div>

        {/* Activation Signals */}
        <ActivationSignals 
          stage={item.stage}
          contacts={contacts}
          outreach={sortedOutreach}
          item={item}
          enrichedAt={enrichedAt}
        />

        {/* Timeline & Status */}
        <div className="space-y-1.5">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            {item.applied_at && <span>Activated: {new Date(item.applied_at).toLocaleDateString()}</span>}
            {item.interview_date && <span>Interview: {new Date(item.interview_date).toLocaleDateString()}</span>}
          </div>

          {/* Primary CTA */}
          {item.stage === "intel_gathering" && contacts.length > 0 && sortedOutreach.length === 0 && (
            <Button
              size="sm"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs h-8 gap-1.5"
              onClick={() => onLaunchOutreach(contacts.map(c => c.id))}
            >
              <Send className="w-3 h-3" />
              Launch Outreach
            </Button>
          )}

          {/* Start Conversation CTA */}
          {(item.stage === "outreach_active" || item.stage === "conversation") && sortedOutreach.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-lg text-xs h-8 gap-1.5"
            >
              <MessageSquare className="w-3 h-3" />
              Continue Conversations
            </Button>
          )}


        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
          {/* Decision Makers Panel */}
          {contacts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-2 uppercase">Decision Makers</p>
              <DecisionMakersPanel
                decisionMakers={contacts}
                companyName={job.company_name}
                onLaunchOutreach={onLaunchOutreach}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
            {(() => {
              const companyName = job?.company_name;
              return (
                <>
                  <Link to={createPageUrl("CompanyDetail") + `?name=${encodeURIComponent(companyName)}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs rounded-lg">
                      View Company Intelligence →
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs rounded-lg"
                    onClick={() => {
                      const newStatus = item.stage === "interviewing" ? "offer" : 
                                       item.stage === "applied" ? "interviewing" : "applied";
                      onStatusChange(item.id, newStatus);
                    }}
                  >
                    Update Status
                  </Button>
                </>
              );
              })()}
          </div>
        </div>
      )}

      {/* Expand/Collapse Indicator */}
      <div className="px-4 py-2 border-t border-gray-100 flex justify-center text-gray-400 hover:text-gray-600 transition-colors">
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
    </div>
  );
}