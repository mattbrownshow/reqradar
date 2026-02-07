import React from "react";

export default function ConversionFunnel({ discovered, activated, sent, replies, interviews }) {
  const overallConversion = discovered > 0 ? ((interviews / discovered) * 100).toFixed(2) : 0;

  const stages = [
    { label: "Opportunities Discovered", count: discovered, color: "bg-blue-100 text-blue-700" },
    { label: "Opportunities Activated", count: activated, color: "bg-indigo-100 text-indigo-700" },
    { label: "Outreach Messages Sent", count: sent, color: "bg-purple-100 text-purple-700" },
    { label: "Replies Received", count: replies, color: "bg-pink-100 text-pink-700" },
    { label: "Interviews Booked", count: interviews, color: "bg-emerald-100 text-emerald-700" }
  ];

  const maxCount = Math.max(...stages.map(s => s.count));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8">
      <h3 className="font-semibold text-gray-900 mb-6 text-lg">Opportunity → Interview Funnel</h3>

      <div className="space-y-4 mb-6">
        {stages.map((stage, idx) => {
          const percentage = maxCount > 0 ? ((stage.count / maxCount) * 100).clamp(5, 100) : 0;
          const conversionFromPrev = idx > 0 && stages[idx - 1].count > 0
            ? ((stage.count / stages[idx - 1].count) * 100).toFixed(1)
            : null;

          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">{stage.label}</p>
                <div className="text-right">
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-semibold ${stage.color}`}>
                    {stage.count}
                  </span>
                  {conversionFromPrev && (
                    <p className="text-xs text-gray-500 mt-0.5">{conversionFromPrev}% of previous</p>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${stage.color.split(" ")[0]}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Overall Conversion:</span> {overallConversion}%
          <span className="text-xs text-gray-500 ml-2">({interviews} interviews / {discovered} discovered)</span>
        </p>
      </div>
    </div>
  );
}

// Add clamp utility
Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
};