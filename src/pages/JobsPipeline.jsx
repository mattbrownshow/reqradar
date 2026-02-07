import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kanban, Building2, MapPin, DollarSign, Calendar, StickyNote } from "lucide-react";

export default function JobsPipeline() {
  const queryClient = useQueryClient();

  const { data: pipelineItems = [], isLoading } = useQuery({
    queryKey: ["jobPipeline"],
    queryFn: () => base44.entities.JobPipeline.list("-created_date")
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["openRoles"],
    queryFn: () => base44.entities.OpenRole.list()
  });

  const moveStageMutation = useMutation({
    mutationFn: ({ pipeline_id, stage }) =>
      base44.functions.invoke("manageJobPipeline", { action: "move", pipeline_id, stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobPipeline"] });
    }
  });

  const stages = [
    { id: "saved", title: "Saved", color: "#3B82F6", emptyTitle: "Start saving roles", emptyText: "When you find interesting opportunities in Open Roles, save them here for research." },
    { id: "researching", title: "Researching", color: "#8B5CF6", emptyTitle: "Research your opportunities", emptyText: "Drag saved roles here when you're actively researching the company and preparing to apply." },
    { id: "applied", title: "Applied", color: "#F59E0B", emptyTitle: "No applications yet", emptyText: "Move roles here when you submit your application. We'll help you track follow-ups." },
    { id: "interviewing", title: "Interviewing", color: "#10B981", emptyTitle: "No active interviews", emptyText: "Roles move here when you're scheduled for interviews or in active conversation." },
    { id: "offer", title: "Offer", color: "#059669", emptyTitle: "No offers yet", emptyText: "The finish line! Offers and final negotiations are tracked here." }
  ];

  const groupedPipeline = stages.reduce((acc, stage) => {
    acc[stage.id] = pipelineItems.filter(item => item.stage === stage.id);
    return acc;
  }, {});

  const onDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.droppableId === result.destination.droppableId) return;

    const itemId = result.draggableId;
    const newStage = result.destination.droppableId;

    moveStageMutation.mutate({ pipeline_id: itemId, stage: newStage });
  };

  // Create a map of jobs by ID for quick lookup
  const jobsMap = jobs.reduce((acc, job) => {
    acc[job.id] = job;
    return acc;
  }, {});

  const stats = {
    active: pipelineItems.length,
    stages: stages.map(s => ({
      ...s,
      count: groupedPipeline[s.id]?.length || 0
    }))
  };

  return (
    <div className="px-4 sm:px-6 py-8 lg:py-12">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
            📊 Jobs Pipeline
          </h1>
          <p className="text-gray-600">Track your applications from Saved → Researching → Applied → Interviewing → Offer.</p>
        </div>

        {/* Stats Header */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-gray-900">
            Active Applications: {stats.active} across {stages.length} stages
          </p>
          <p className="text-xs text-gray-600 mt-1">
            This month: {pipelineItems.filter(i => i.stage === "applied").length} applied, {pipelineItems.filter(i => i.stage === "interviewing").length} interviews, {pipelineItems.filter(i => i.stage === "offer").length} offers
          </p>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                items={groupedPipeline[stage.id] || []}
                jobsMap={jobsMap}
              />
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}

function PipelineColumn({ stage, items, jobsMap }) {
  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div
          className="px-4 py-3 border-b border-gray-200 flex items-center justify-between"
          style={{ 
            borderTopWidth: "4px", 
            borderTopColor: stage.color,
            backgroundColor: `${stage.color}10`
          }}
        >
          <h3 className="font-bold text-gray-900">{stage.title}</h3>
          <Badge 
            variant="outline" 
            className="rounded-full font-semibold"
            style={{ color: stage.color, borderColor: stage.color }}
          >
            {items.length}
          </Badge>
        </div>

        <Droppable droppableId={stage.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-3 min-h-[500px] space-y-3 transition-colors ${
                snapshot.isDraggingOver ? "bg-gray-50" : "bg-gray-50/50"
              }`}
            >
              {items.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">{stage.emptyTitle}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{stage.emptyText}</p>
                </div>
              ) : (
                items.map((item, index) => {
                  const job = jobsMap[item.job_id];
                  return (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`${snapshot.isDragging ? "opacity-60 rotate-2" : ""}`}
                        >
                          <JobPipelineCard item={item} job={job} stage={stage} />
                        </div>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}

function JobPipelineCard({ item, job, stage }) {
  const [expanded, setExpanded] = React.useState(false);

  if (!job) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-500">Job not found</p>
      </div>
    );
  }

  const priorityColors = {
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-gray-100 text-gray-600"
  };

  return (
    <div 
      className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-[#FF9E4D] transition-all cursor-move"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Minimal Card View */}
      <h4 className="font-bold text-gray-900 mb-1.5 line-clamp-2 text-sm">{job.title}</h4>
      <p className="text-xs text-gray-600 mb-3">{job.company_name}</p>
      
      {job.salary_min && job.salary_max && (
        <p className="text-xs font-medium text-gray-700 mb-2">
          ${(job.salary_min / 1000).toFixed(0)}K - ${(job.salary_max / 1000).toFixed(0)}K
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        {item.applied_at && (
          <span className="flex items-center gap-1">
            📅 Applied: {new Date(item.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {item.saved_at && !item.applied_at && (
          <span className="flex items-center gap-1">
            📅 Saved: {new Date(item.saved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {item.interview_date && (
        <p className="text-xs text-blue-600 flex items-center gap-1 mb-2">
          🔔 Follow-up: {new Date(item.interview_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      )}

      {/* Expandable Detail View */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          {job.location && (
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.location}
            </p>
          )}
          
          {job.work_type && (
            <p className="text-xs text-gray-600">
              {job.work_type}
            </p>
          )}

          {item.notes && (
            <>
              <p className="text-xs font-semibold text-gray-900 mt-3">Recent Activity:</p>
              <p className="text-xs text-gray-600">{item.notes}</p>
            </>
          )}

          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="text-xs h-7 rounded-lg flex-1">
              View Job Details →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}