import React from "react";
import { Building2, Users, Send, Calendar } from "lucide-react";
import MetricCard from "../shared/MetricCard";

export default function PipelineMetrics({ pipelineItems, outreachData }) {
  const opportunitiesCount = pipelineItems.length;
  
  const decisionMakersCount = pipelineItems.reduce((total, item) => {
    return total + (item.decision_makers?.length || 0);
  }, 0);
  
  const activeOutreach = outreachData.filter(o => 
    ["queued", "sent", "delivered", "opened"].includes(o.status)
  ).length;
  
  const interviewsScheduled = pipelineItems.filter(
    item => item.stage === "interviewing" && item.interview_date
  ).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        icon={Building2}
        title="Opportunities in Pipeline"
        value={opportunitiesCount}
        subtitle="Active opportunities"
        bgColor="bg-orange-50"
        iconColor="text-[#F7931E]"
      />
      <MetricCard
        icon={Users}
        title="Decision Makers Identified"
        value={decisionMakersCount}
        subtitle="Total contacts"
        bgColor="bg-blue-50"
        iconColor="text-blue-500"
      />
      <MetricCard
        icon={Send}
        title="Active Outreach Campaigns"
        value={activeOutreach}
        subtitle="In progress"
        bgColor="bg-purple-50"
        iconColor="text-purple-500"
      />
      <MetricCard
        icon={Calendar}
        title="Interviews Scheduled"
        value={interviewsScheduled}
        subtitle="Upcoming"
        bgColor="bg-emerald-50"
        iconColor="text-emerald-500"
      />
    </div>
  );
}