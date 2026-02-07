import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import TierOneMetrics from "../components/analytics/TierOneMetrics";
import TierTwoMetrics from "../components/analytics/TierTwoMetrics";
import TierThreeMetrics from "../components/analytics/TierThreeMetrics";
import ConversionFunnel from "../components/analytics/ConversionFunnel";
import OutreachPerformanceTable from "../components/analytics/OutreachPerformanceTable";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const CHART_COLORS = ["#F7931E", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#6366F1", "#EC4899"];

export default function Analytics() {
  const [showPerformanceTable, setShowPerformanceTable] = useState(false);

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

  const { data: pipeline = [] } = useQuery({
    queryKey: ["jobPipeline"],
    queryFn: () => base44.entities.JobPipeline.list("-created_date", 500),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("-created_date", 500),
  });

  // Tier 1 Metrics: Conversion Outcomes
  const interviews = pipeline.filter(p => p.stage === "interview_scheduled").length;
  const replies = outreach.filter(o => o.status === "responded").length;
  const messagesSent = outreach.filter(o => o.status !== "draft").length;

  // Tier 2 Metrics: Activation Infrastructure
  const decisionMakersIdentified = contacts.length;
  const opportunitiesActivated = pipeline.filter(p => p.stage !== "saved").length;

  // Tier 3 Metrics: Pipeline Size
  const companiesSaved = companies.filter(c => c.tracked).length;
  const opportunitiesTotal = pipeline.length;

  // Funnel Data
  const opportunitiesDiscovered = roles.length;
  const messagesDelivered = outreach.filter(o => ["delivered", "opened", "responded"].includes(o.status)).length;
  const messagesOpened = outreach.filter(o => ["opened", "responded"].includes(o.status)).length;
  const positiveReplies = replies; // Simplified - could add sentiment analysis later

  // Performance Metrics
  const performanceMetrics = {
    sent: messagesSent,
    delivered: messagesDelivered,
    opened: messagesOpened,
    replies: replies,
    positiveReplies: positiveReplies,
    interviews: interviews
  };

  // Industry breakdown - now based on interviews
  const industryInterviewMap = {};
  pipeline.filter(p => p.stage === "interview_scheduled").forEach(p => {
    const job = roles.find(r => r.id === p.job_id);
    if (job && job.industry) {
      industryInterviewMap[job.industry] = (industryInterviewMap[job.industry] || 0) + 1;
    }
  });
  const industryData = Object.entries(industryInterviewMap).map(([name, value]) => ({ name, value }));

  // Company size breakdown - based on replies
  const companySizeMap = {};
  outreach.filter(o => o.status === "responded").forEach(o => {
    const company = companies.find(c => c.name === o.company_name);
    if (company && company.employee_count) {
      let size = "Other";
      if (company.employee_count < 50) size = "Startup (1-50)";
      else if (company.employee_count < 200) size = "Small (51-200)";
      else if (company.employee_count < 1000) size = "Mid-size (201-1000)";
      else size = "Enterprise (1000+)";
      companySizeMap[size] = (companySizeMap[size] || 0) + 1;
    }
  });
  const companySizeData = Object.entries(companySizeMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">Track pursuit momentum: conversions, replies, interviews, and activation performance</p>
      </div>

      {/* Tier 1: Conversion Outcomes (Large Cards) */}
      <TierOneMetrics 
        interviews={interviews} 
        replies={replies} 
        messagesSent={messagesSent} 
      />

      {/* Tier 2: Activation Infrastructure (Medium Cards) */}
      <TierTwoMetrics
        messagesSent={messagesSent}
        decisionMakersIdentified={decisionMakersIdentified}
        opportunitiesActivated={opportunitiesActivated}
      />

      {/* Tier 3: Pipeline Size (Small Cards) */}
      <TierThreeMetrics
        companiesSaved={companiesSaved}
        opportunitiesTotal={opportunitiesTotal}
      />

      {/* Conversion Funnel */}
      <ConversionFunnel
        discovered={opportunitiesDiscovered}
        activated={opportunitiesActivated}
        sent={messagesSent}
        replies={replies}
        interviews={interviews}
      />

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interviews by Industry */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Interviews Booked by Industry</h3>
          {industryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={industryData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[280px] text-sm text-gray-400">
              <p>No interviews booked yet</p>
              <p className="text-xs mt-1">Activate opportunities and launch outreach to track conversions</p>
            </div>
          )}
        </div>

        {/* Replies by Company Size */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Replies Received by Company Size</h3>
          {companySizeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={companySizeData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={100} 
                  paddingAngle={2} 
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {companySizeData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[280px] text-sm text-gray-400">
              <p>No replies yet</p>
              <p className="text-xs mt-1">Send outreach messages to track response patterns</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics Table (Collapsible) */}
      <div>
        <button
          onClick={() => setShowPerformanceTable(!showPerformanceTable)}
          className="w-full text-left text-sm font-semibold text-gray-900 hover:text-[#FF9E4D] transition-colors mb-4"
        >
          {showPerformanceTable ? "− Hide" : "+ Show"} Detailed Outreach Performance
        </button>
        {showPerformanceTable && (
          <OutreachPerformanceTable metrics={performanceMetrics} />
        )}
      </div>
    </div>
  );
}