import React from "react";
import { Send, Eye, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

export default function OutreachStatusBar({ outreachStatus, opportunityId }) {
  if (!outreachStatus) {
    return (
      <div className="text-xs text-gray-500 py-2">
        Outreach Status: Not Started
      </div>
    );
  }

  const statusConfig = {
    draft: { label: "Draft", icon: null, color: "text-gray-500" },
    queued: { label: "Queued", icon: Clock, color: "text-yellow-600" },
    sent: { label: "Sent", icon: Send, color: "text-blue-600" },
    delivered: { label: "Delivered", icon: CheckCircle2, color: "text-indigo-600" },
    opened: { label: "Opened", icon: Eye, color: "text-purple-600" },
    responded: { label: "Reply Received", icon: MessageSquare, color: "text-emerald-600" }
  };

  const config = statusConfig[outreachStatus.status] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${config.color}`} />}
        <p className="text-sm font-semibold text-gray-900">
          Outreach Status: {config.label}
        </p>
      </div>

      <div className="text-xs text-gray-600 space-y-1">
        {outreachStatus.messagesCount > 0 && (
          <p>├─ {outreachStatus.messagesCount} messages sent</p>
        )}
        {outreachStatus.repliesCount > 0 && (
          <p>├─ {outreachStatus.repliesCount} replies received</p>
        )}
        {outreachStatus.lastContactDate && (
          <p>└─ Last contact: {new Date(outreachStatus.lastContactDate).toLocaleDateString()}</p>
        )}
      </div>

      <Link to={createPageUrl("Outreach")}>
        <Button size="sm" variant="outline" className="w-full text-xs rounded-lg">
          View Campaign →
        </Button>
      </Link>
    </div>
  );
}

function Clock({ className }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></svg>;
}