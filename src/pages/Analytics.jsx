import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, Target, Briefcase, BarChart3
} from "lucide-react";
import MetricCard from "../components/shared/MetricCard";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const CHART_COLORS = ["#F7931E", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#6366F1", "#EC4899"];

export default function Analytics() {
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 500),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["openRoles"],
    queryFn: () => base44.entities.OpenRole.list("-created_date", 500),
  });

  const { data: outreach = [] } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => base44.entities.OutreachMessage.list("-created_date", 500),
  });

  // Industry breakdown
  const industryMap = {};
  companies.forEach(c => {
    if (c.industry) {
      industryMap[c.industry] = (industryMap[c.industry] || 0) + 1;
    }
  });
  const industryData = Object.entries(industryMap).map(([name, value]) => ({ name, value }));

  // Pipeline stage breakdown
  const stageMap = {};
  companies.forEach(c => {
    const stage = c.pipeline_stage || "research";
    stageMap[stage] = (stageMap[stage] || 0) + 1;
  });
  const stageData = Object.entries(stageMap).map(([name, value]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    value
  }));

  // Match score distribution
  const scoreRanges = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  companies.forEach(c => {
    const s = c.match_score || 0;
    if (s <= 20) scoreRanges["0-20"]++;
    else if (s <= 40) scoreRanges["21-40"]++;
    else if (s <= 60) scoreRanges["41-60"]++;
    else if (s <= 80) scoreRanges["61-80"]++;
    else scoreRanges["81-100"]++;
  });
  const scoreData = Object.entries(scoreRanges).map(([name, count]) => ({ name, count }));

  const contacted = companies.filter(c => c.pipeline_stage && c.pipeline_stage !== "research").length;
  const avgScore = companies.length > 0
    ? Math.round(companies.reduce((s, c) => s + (c.match_score || 0), 0) / companies.length)
    : 0;

  return (
    <div className="px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
        <p className="text-sm text-gray-500 mt-2">Track your job search metrics: activations, responses, interviews, and conversion rates.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Building2} title="Total Companies" value={companies.length} trend={companies.length > 0 ? `Tracked` : "—"} />
        <MetricCard icon={Target} title="Opportunities Activated" value={contacted} subtitle={companies.length > 0 ? `${Math.round(contacted / companies.length * 100)}% activation rate` : "—"} bgColor="bg-blue-50" iconColor="text-blue-500" />
        <MetricCard icon={Briefcase} title="Open Positions" value={roles.length} subtitle={`${companies.length} companies hiring`} bgColor="bg-purple-50" iconColor="text-purple-500" />
        <MetricCard icon={BarChart3} title="Avg. Match Score" value={avgScore} subtitle="ICP alignment" bgColor="bg-emerald-50" iconColor="text-emerald-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Pie Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Companies by Industry</h3>
          {industryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={industryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {industryData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">No data yet</div>
          )}
        </div>

        {/* Pipeline Bar Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Pipeline Breakdown</h3>
          {stageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#F7931E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">No data yet</div>
          )}
        </div>

        {/* Match Score Distribution */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-6">Match Score Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}