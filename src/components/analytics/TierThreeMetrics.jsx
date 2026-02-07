import React from "react";
import { Building2, Briefcase } from "lucide-react";

const TierThreeCard = ({ icon: Icon, title, value, iconColor }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <div className="flex items-center gap-3">
      <div className="p-1.5 bg-gray-100 rounded-lg">
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-gray-600 font-medium">{title}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

export default function TierThreeMetrics({ companiesSaved, opportunitiesTotal }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <TierThreeCard
        icon={Building2}
        title="Companies Saved"
        value={companiesSaved}
        iconColor="text-blue-500"
      />
      <TierThreeCard
        icon={Briefcase}
        title="Opportunities in Pipeline"
        value={opportunitiesTotal}
        iconColor="text-purple-500"
      />
    </div>
  );
}