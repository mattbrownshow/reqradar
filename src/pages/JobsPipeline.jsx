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
    { id: "saved", title: "Saved", color: "#3B82F6" },
    { id: "researching", title: "Researching", color: "#8B5CF6" },
    { id: "applied", title: "Applied", color: "#F59E0B" },
    { id: "interviewing", title: "Interviewing", color: "#10B981" },
    { id: "offer", title: "Offers", color: "#EF4444" }
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

  return (
    <div className="px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Kanban className="w-6 h-6 text-[#F7931E]" />
          Application Tracker
        </h1>
        <p className="text-sm text-gray-500 mt-2">Move opportunities through your executive search workflow: Evaluating → Preparing → Submitted → In Process → Offer.</p>
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
  );
}

function PipelineColumn({ stage, items, jobsMap }) {
  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div
          className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
          style={{ borderTopWidth: "3px", borderTopColor: stage.color }}
        >
          <h3 className="font-semibold text-gray-900">{stage.title}</h3>
          <Badge variant="outline" className="rounded-full">
            {items.length}
          </Badge>
        </div>

        <Droppable droppableId={stage.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-3 min-h-[500px] space-y-3 ${
                snapshot.isDraggingOver ? "bg-gray-50" : ""
              }`}
            >
              {items.map((item, index) => {
                const job = jobsMap[item.job_id];
                return (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`${snapshot.isDragging ? "opacity-50" : ""}`}
                      >
                        <JobPipelineCard item={item} job={job} />
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}

function JobPipelineCard({ item, job }) {
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
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-[#F7931E] transition-colors cursor-move">
      <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{job.title}</h4>
      
      {job.company_name && (
        <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
          <Building2 className="w-3 h-3" />
          {job.company_name}
        </p>
      )}
      
      {job.location && (
        <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
          <MapPin className="w-3 h-3" />
          {job.location}
        </p>
      )}

      {job.salary_min && job.salary_max && (
        <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
          <DollarSign className="w-3 h-3" />
          ${(job.salary_min / 1000).toFixed(0)}K - ${(job.salary_max / 1000).toFixed(0)}K
        </p>
      )}

      {item.priority && (
        <Badge className={`${priorityColors[item.priority]} text-xs mb-2`}>
          {item.priority} priority
        </Badge>
      )}

      {item.interview_date && (
        <p className="text-xs text-blue-600 flex items-center gap-1 mb-2">
          <Calendar className="w-3 h-3" />
          Interview: {new Date(item.interview_date).toLocaleDateString()}
        </p>
      )}

      {item.notes && (
        <p className="text-xs text-gray-500 flex items-start gap-1 line-clamp-2">
          <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {item.notes}
        </p>
      )}

      <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
        Saved {new Date(item.saved_at).toLocaleDateString()}
      </p>
    </div>
  );
}