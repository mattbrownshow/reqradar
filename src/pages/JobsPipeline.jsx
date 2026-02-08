import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kanban, Building2, MapPin, DollarSign, Calendar, StickyNote } from "lucide-react";
import PipelineMetrics from "../components/pipeline/PipelineMetrics";
import EnhancedPipelineCard from "../components/pipeline/EnhancedPipelineCard";

export default function JobsPipeline() {
  const queryClient = useQueryClient();

  const { data: pipelineItems = [], isLoading } = useQuery({
    queryKey: ["jobPipeline"],
    queryFn: async () => {
      const results = await base44.entities.JobPipeline.list("-created_date");
      console.log('=== PIPELINE DATA LOADED ===');
      console.log('Total items:', results.length);
      if (results.length > 0) {
        console.log('Sample item:', results[0]);
        console.log('Has job_id?', !!results[0].job_id);
        console.log('Has company_id?', !!results[0].company_id);
        console.log('company_id value:', results[0].company_id);
      }
      return results;
    }
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["openRoles"],
    queryFn: () => base44.entities.OpenRole.list()
  });

  const { data: outreach = [] } = useQuery({
    queryKey: ["outreach"],
    queryFn: () => base44.entities.OutreachMessage.list("-created_date", 500)
  });

  const moveStageMutation = useMutation({
    mutationFn: ({ pipeline_id, stage }) =>
      base44.functions.invoke("manageJobPipeline", { action: "move", pipeline_id, stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobPipeline"] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, stage }) =>
      base44.entities.JobPipeline.update(id, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobPipeline"] });
    }
  });

  const stages = [
    { id: "saved", title: "Saved", color: "#3B82F6", emptyTitle: "Start saving opportunities", emptyText: "Save opportunities you want to explore. Begin gathering intelligence on companies and decision makers." },
    { id: "intel_gathering", title: "Intel Gathering", color: "#8B5CF6", emptyTitle: "Gather intelligence", emptyText: "Research companies and identify decision makers. Once you've mapped contacts, launch outreach." },
    { id: "outreach_active", title: "Outreach Active", color: "#F59E0B", emptyTitle: "No active campaigns", emptyText: "Outreach campaigns underway to decision makers. Track message delivery and engagement." },
    { id: "conversation", title: "Conversation", color: "#10B981", emptyTitle: "No conversations yet", emptyText: "Decision makers have replied. Move here to manage ongoing dialogue and next steps." },
    { id: "interview_scheduled", title: "Interview Scheduled", color: "#059669", emptyTitle: "No scheduled interviews", emptyText: "Interviews booked and confirmed. Track meeting details and follow-ups here." },
    { id: "closed", title: "Closed", color: "#065F46", emptyTitle: "No closed opportunities", emptyText: "Outcome decided—offer accepted, declined, or rejected." }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pipeline</h1>
          <p className="text-gray-600">Track activated opportunities and manage outreach to decision makers</p>
        </div>

        {/* Metrics */}
        <div className="mb-6">
          <PipelineMetrics pipelineItems={pipelineItems} outreachData={outreach} />
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
  const queryClient = useQueryClient();
  
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, stage }) =>
      base44.entities.JobPipeline.update(id, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobPipeline"] });
    }
  });

  const handleStatusChange = (itemId, newStage) => {
    updateStatusMutation.mutate({ id: itemId, stage: newStage });
  };

  const handleLaunchOutreach = (selectedDMIds) => {
    // Navigate to outreach page with context
    window.location.href = `/outreach?opportunity_id=${item.id}&contacts=${selectedDMIds.join(",")}`;
  };

  return (
    <EnhancedPipelineCard
      item={item}
      job={job}
      onStatusChange={handleStatusChange}
      onLaunchOutreach={handleLaunchOutreach}
    />
  );
}