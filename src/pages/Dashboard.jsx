import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, FileText, Handshake, CalendarDays,
  ArrowUpRight, Search, Target, Clock, CheckCircle2,
  Send, MessageSquare, TrendingUp, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "../components/shared/MetricCard";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 100),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => base44.entities.Application.list("-created_date", 100),
  });

  const { data: outreach = [] } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => base44.entities.OutreachMessage.list("-created_date", 100),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.ActivityLog.list("-created_date", 20),
  });

  const interviews = applications.filter(a => a.status === "interview");
  const sentOutreach = outreach.filter(o => o.status !== "draft");
  const responses = outreach.filter(o => o.status === "responded");

  const activityIcons = {
    application: <FileText className="w-4 h-4 text-blue-500" />,
    outreach: <Send className="w-4 h-4 text-[#F7931E]" />,
    response: <MessageSquare className="w-4 h-4 text-emerald-500" />,
    interview: <CalendarDays className="w-4 h-4 text-purple-500" />,
    status_change: <TrendingUp className="w-4 h-4 text-indigo-500" />,
    company_added: <Building2 className="w-4 h-4 text-gray-500" />,
  };

  return (
    <div className="px-4 sm:px-6 py-8 space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FEF3E2] via-white to-orange-50 rounded-3xl p-8 sm:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F7931E] opacity-5 rounded-full -translate-y-32 translate-x-32" />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Welcome to <span style={{ color: "#F7931E" }}>Flowzyn</span>
          </h1>
          <p className="mt-3 text-gray-500 text-lg max-w-xl">
            Executive job search excellence powered by AI automation
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={createPageUrl("Companies")}>
              <Button className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2">
                <Building2 className="w-4 h-4" />
                View All Companies
              </Button>
            </Link>
            <Link to={createPageUrl("OpenRoles")}>
              <Button variant="outline" className="rounded-xl gap-2 border-gray-200">
                <FileText className="w-4 h-4" />
                View All Roles
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Building2}
          title="Total Companies"
          value={companies.length}
          subtitle="In your target list"
          trend={companies.length > 0 ? `${companies.length} tracked` : "Start adding companies"}
        />
        <MetricCard
          icon={FileText}
          title="Applications"
          value={applications.length}
          subtitle="Submitted"
          trend={applications.filter(a => {
            const d = new Date(a.created_date);
            const now = new Date();
            return d > new Date(now - 7 * 24 * 60 * 60 * 1000);
          }).length + " this week"}
          bgColor="bg-blue-50"
          iconColor="text-blue-500"
        />
        <MetricCard
          icon={Handshake}
          title="Outreach Sent"
          value={sentOutreach.length}
          subtitle="To decision makers"
          trend={responses.length + " responses"}
          bgColor="bg-purple-50"
          iconColor="text-purple-500"
        />
        <MetricCard
          icon={CalendarDays}
          title="Interviews"
          value={interviews.length}
          subtitle={interviews.length > 0 ? "Active interviews" : "No upcoming interviews"}
          bgColor="bg-emerald-50"
          iconColor="text-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl">
          <div className="p-6 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Your activity feed will show your job search actions here - applications submitted, companies added, outreach sent, interview updates, and status changes.
              </div>
            ) : (
              activities.slice(0, 8).map((activity) => (
                <div key={activity.id} className="px-6 py-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mt-0.5 shrink-0">
                    {activityIcons[activity.type] || <Clock className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {format(new Date(activity.created_date), "MMM d, h:mm a")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#FEF3E2] to-orange-50 rounded-2xl p-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Search className="w-5 h-5 text-[#F7931E]" />
              </div>
              <h3 className="font-semibold text-gray-900">Find Companies</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Discover target companies matching your executive profile
            </p>
            <Link to={createPageUrl("Companies")}>
              <Button className="w-full bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2">
                Start Searching <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-900">Search Job Boards</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Aggregate executive roles from Indeed, LinkedIn, and more
            </p>
            <Link to={createPageUrl("JobBoards")}>
              <Button variant="outline" className="w-full rounded-xl gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                Search Now <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Top Companies</h3>
            <div className="space-y-3">
              {companies.slice(0, 4).map((company) => (
                <Link
                  key={company.id}
                  to={createPageUrl("CompanyDetail") + `?id=${company.id}`}
                  className="flex items-center justify-between py-1 group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-600">
                      {company.match_score || "–"}
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-[#F7931E] transition-colors">
                      {company.name}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#F7931E] transition-colors" />
                </Link>
              ))}
              {companies.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">No companies yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}