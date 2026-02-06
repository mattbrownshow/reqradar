import React from "react";

export default function MetricCard({ icon: Icon, title, value, subtitle, trend, trendColor = "text-emerald-600", bgColor = "bg-orange-50", iconColor = "text-[#F7931E]" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500 tracking-wide uppercase">{title}</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 pt-4 border-t border-gray-50">
          <span className={`text-sm font-medium ${trendColor}`}>{trend}</span>
        </div>
      )}
    </div>
  );
}