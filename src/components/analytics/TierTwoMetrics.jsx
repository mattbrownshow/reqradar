import React from "react";
import { Send, Users, Zap } from "lucide-react";

const TierTwoCard = ({ icon: Icon, title, value, subtitle, bgColor, iconColor }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-6">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-2.5 ${bgColor} rounded-lg`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
    <p className="text-sm text-gray-600 font-medium">{title}</p>
    <div className="text-3xl font-bold text-gray-900 mt-2">{value}</div>
    {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
  </div>
);

export default function TierTwoMetrics({ messagesSent, decisionMakersIdentified, opportunitiesActivated }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <TierTwoCard
        icon={Send}
        title="Outreach Sent"
        value={messagesSent}
        subtitle="Active campaigns"
        bgColor="bg-orange-50"
        iconColor="text-orange-500"
      />
      <TierTwoCard
        icon={Users}
        title="Decision Makers Identified"
        value={decisionMakersIdentified}
        subtitle="Mapped contacts"
        bgColor="bg-blue-50"
        iconColor="text-blue-500"
      />
      <TierTwoCard
        icon={Zap}
        title="Opportunities Activated"
        value={opportunitiesActivated}
        subtitle="In pursuit"
        bgColor="bg-purple-50"
        iconColor="text-purple-500"
      />
    </div>
  );
}