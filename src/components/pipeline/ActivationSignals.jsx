import React from "react";
import { Mail, MessageSquare, Clock, Zap, AlertCircle } from "lucide-react";

export default function ActivationSignals({ stage, contacts, outreach, item }) {
  // Engagement data
  const totalMessages = outreach.length;
  const deliveredMessages = outreach.filter(o => ["delivered", "opened", "responded"].includes(o.status)).length;
  const replies = outreach.filter(o => o.status === "responded").length;
  const lastInteraction = outreach.length > 0 
    ? new Date(outreach[0].sent_at || outreach[0].created_date)
    : null;

  const getNextAction = () => {
    switch (stage) {
      case "saved":
        return contacts.length > 0 
          ? `Ready: ${contacts.length} decision maker${contacts.length !== 1 ? "s" : ""} identified`
          : "Action: Enrich with decision makers";
      case "intel_gathering":
        return contacts.length > 0
          ? `Enriched: ${contacts.length} contact${contacts.length !== 1 ? "s" : ""} mapped`
          : "Enriching: Gathering intelligence";
      case "outreach_active":
        if (totalMessages === 0) return "Action: Launch first outreach";
        if (replies > 0) return `${replies} reply${replies !== 1 ? "s" : ""} received`;
        return `Sent to ${deliveredMessages}/${totalMessages}`;
      case "conversation":
        return replies > 0 
          ? `Last reply: ${formatTimeAgo(lastInteraction)}`
          : "Awaiting response";
      case "interview_scheduled":
        return item.interview_date 
          ? `Interview: ${new Date(item.interview_date).toLocaleDateString()}`
          : "Confirm interview details";
      case "closed":
        return "Opportunity closed";
      default:
        return "Next action pending";
    }
  };

  const getEnrichmentStatus = () => {
    if (contacts.length === 0) return "Need enrichment";
    const verifiedContacts = contacts.filter(c => c.email_verified).length;
    return `${contacts.length} contact${contacts.length !== 1 ? "s" : ""} (${verifiedContacts} verified)`;
  };

  const getEngagementIndicator = () => {
    if (totalMessages === 0) return null;
    
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Mail className="w-3 h-3 text-blue-500" />
          <span>{deliveredMessages}/{totalMessages}</span>
        </div>
        {replies > 0 && (
          <div className="flex items-center gap-1 text-green-600 font-semibold">
            <MessageSquare className="w-3 h-3" />
            <span>{replies} reply</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2 text-xs">
      {/* Enrichment/Contact Status */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
        <Zap className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span className="text-gray-700">{getEnrichmentStatus()}</span>
      </div>

      {/* Engagement Signals */}
      {getEngagementIndicator() && (
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
          {getEngagementIndicator()}
        </div>
      )}

      {/* Next Action */}
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
        <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
        <span className="text-gray-700 font-medium">{getNextAction()}</span>
      </div>

      {/* Last Interaction (for active stages) */}
      {lastInteraction && (stage === "conversation" || stage === "outreach_active") && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span className="text-gray-600">{formatTimeAgo(lastInteraction)}</span>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}