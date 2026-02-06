import React from "react";
import { Button } from "@/components/ui/button";

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-6">
          <Icon className="w-8 h-8 text-[#F7931E]" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl px-6"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}