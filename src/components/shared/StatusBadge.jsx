import React from "react";

const statusStyles = {
  research: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-50 text-blue-700",
  engaged: "bg-purple-50 text-purple-700",
  negotiation: "bg-amber-50 text-amber-700",
  partnership: "bg-emerald-50 text-emerald-700",
  closed: "bg-green-50 text-green-700",
  applied: "bg-blue-50 text-blue-700",
  activated: "bg-blue-50 text-blue-700",
  screening: "bg-indigo-50 text-indigo-700",
  interview: "bg-purple-50 text-purple-700",
  offer: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  withdrawn: "bg-gray-100 text-gray-600",
  new: "bg-orange-50 text-[#F7931E]",
  saved: "bg-blue-50 text-blue-700",
  not_interested: "bg-gray-100 text-gray-500",
  draft: "bg-gray-100 text-gray-600",
  queued: "bg-yellow-50 text-yellow-700",
  sent: "bg-blue-50 text-blue-700",
  delivered: "bg-indigo-50 text-indigo-700",
  opened: "bg-purple-50 text-purple-700",
  responded: "bg-emerald-50 text-emerald-700",
  bounced: "bg-red-50 text-red-700",
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-yellow-50 text-yellow-700",
  error: "bg-red-50 text-red-700",
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || "bg-gray-100 text-gray-600";
  
  // Custom label mapping for specific statuses
  const customLabels = {
    applied: "Activated",
    activated: "Activated"
  };
  
  const label = customLabels[status] || status?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}