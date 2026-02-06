import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { MapPin, Building2, Briefcase, MoreHorizontal } from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";

const STAGES = [
  { id: "research", label: "Research", color: "bg-gray-400" },
  { id: "contacted", label: "Contacted", color: "bg-blue-400" },
  { id: "engaged", label: "Engaged", color: "bg-purple-400" },
  { id: "negotiation", label: "Negotiation", color: "bg-amber-400" },
  { id: "partnership", label: "Partnership", color: "bg-emerald-400" },
  { id: "closed", label: "Closed", color: "bg-green-500" },
];

export default function Pipeline() {
  const queryClient = useQueryClient();

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-match_score", 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, stage }) => base44.entities.Company.update(id, { pipeline_stage: stage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const companyId = result.draggableId;
    const newStage = result.destination.droppableId;
    updateMutation.mutate({ id: companyId, stage: newStage });
  };

  const getCompaniesForStage = (stageId) =>
    companies.filter(c => (c.pipeline_stage || "research") === stageId);

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pipeline</h1>
        <p className="text-sm text-gray-500 mt-1">Drag companies between stages to update their status</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
          {STAGES.map((stage) => {
            const stageCompanies = getCompaniesForStage(stage.id);
            return (
              <Droppable key={stage.id} droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-[280px] bg-gray-50/80 rounded-2xl border transition-colors ${
                      snapshot.isDraggingOver ? "border-[#F7931E] bg-orange-50/30" : "border-gray-100"
                    }`}
                  >
                    {/* Column Header */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                          <h3 className="text-sm font-semibold text-gray-700">{stage.label}</h3>
                        </div>
                        <span className="text-xs font-medium text-gray-400 bg-white px-2 py-0.5 rounded-full">
                          {stageCompanies.length}
                        </span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="p-3 space-y-3 min-h-[200px]">
                      {stageCompanies.map((company, index) => (
                        <Draggable key={company.id} draggableId={company.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-xl border p-4 transition-shadow ${
                                snapshot.isDragging ? "shadow-lg border-[#F7931E]" : "border-gray-100 hover:shadow-md"
                              }`}
                            >
                              <Link to={createPageUrl("CompanyDetail") + `?id=${company.id}`}>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-xs font-bold text-[#F7931E]">
                                      {company.match_score || "–"}
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900 hover:text-[#F7931E] transition-colors">
                                      {company.name}
                                    </h4>
                                  </div>
                                </div>
                                <div className="space-y-1 text-xs text-gray-500">
                                  {company.industry && (
                                    <div className="flex items-center gap-1">
                                      <Building2 className="w-3 h-3" />
                                      {company.industry}
                                    </div>
                                  )}
                                  {company.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {company.location}
                                    </div>
                                  )}
                                  {company.open_positions_count > 0 && (
                                    <div className="flex items-center gap-1 text-[#F7931E] font-medium">
                                      <Briefcase className="w-3 h-3" />
                                      {company.open_positions_count} open
                                    </div>
                                  )}
                                </div>
                              </Link>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}