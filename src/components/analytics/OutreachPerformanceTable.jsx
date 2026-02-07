import React from "react";
import { CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";

export default function OutreachPerformanceTable({ metrics }) {
  const getBenchmarkStatus = (actual, benchmark) => {
    if (actual > benchmark) return { icon: CheckCircle2, color: "text-green-600", label: "Above avg", bgColor: "bg-green-50" };
    if (actual >= benchmark * 0.95) return { icon: AlertCircle, color: "text-yellow-600", label: "At avg", bgColor: "bg-yellow-50" };
    return { icon: AlertCircle, color: "text-red-600", label: "Below avg", bgColor: "bg-red-50" };
  };

  const rows = [
    { metric: "Messages Sent", count: metrics.sent, rate: "—", benchmark: "—" },
    { metric: "Messages Delivered", count: metrics.delivered, rate: `${metrics.sent > 0 ? ((metrics.delivered / metrics.sent) * 100).toFixed(1) : 0}%`, benchmark: 95.8, benchmarkVal: "92%" },
    { metric: "Messages Opened", count: metrics.opened, rate: `${metrics.sent > 0 ? ((metrics.opened / metrics.sent) * 100).toFixed(1) : 0}%`, benchmark: 28, benchmarkVal: "28%" },
    { metric: "Replies Received", count: metrics.replies, rate: `${metrics.sent > 0 ? ((metrics.replies / metrics.sent) * 100).toFixed(1) : 0}%`, benchmark: 6.5, benchmarkVal: "6-8%" },
    { metric: "Positive Replies", count: metrics.positiveReplies, rate: `${metrics.sent > 0 ? ((metrics.positiveReplies / metrics.sent) * 100).toFixed(1) : 0}%`, benchmark: 4, benchmarkVal: "4%" },
    { metric: "Interview Requests", count: metrics.interviews, rate: `${metrics.sent > 0 ? ((metrics.interviews / metrics.sent) * 100).toFixed(1) : 0}%`, benchmark: 1.5, benchmarkVal: "1.5%" }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Outreach Performance Details</h3>
        <p className="text-xs text-gray-500 mt-1">Benchmark data based on executive outreach industry averages</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 font-semibold text-gray-900">Metric</th>
              <th className="text-center px-6 py-3 font-semibold text-gray-900">Count</th>
              <th className="text-center px-6 py-3 font-semibold text-gray-900">Rate</th>
              <th className="text-left px-6 py-3 font-semibold text-gray-900">vs. Benchmark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const actualRate = row.benchmark ? parseFloat(row.rate) : null;
              const benchmarkStatus = actualRate !== null ? getBenchmarkStatus(actualRate, row.benchmark) : null;
              const StatusIcon = benchmarkStatus?.icon;

              return (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-6 py-4 text-gray-900 font-medium">{row.metric}</td>
                  <td className="text-center px-6 py-4 text-gray-700">{row.count}</td>
                  <td className="text-center px-6 py-4 text-gray-700 font-medium">{row.rate}</td>
                  <td className="px-6 py-4">
                    {benchmarkStatus ? (
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${benchmarkStatus.bgColor} ${benchmarkStatus.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {benchmarkStatus.label} ({row.benchmarkVal})
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}