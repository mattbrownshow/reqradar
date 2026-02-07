import React, { useState } from "react";
import { Mail, Linkedin, Phone, X, Send, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";

export default function DecisionMakersPanel({ decisionMakers = [], companyName, onLaunchOutreach }) {
  const [selectedDMs, setSelectedDMs] = useState([]);

  const verifiedCount = decisionMakers.filter(dm => dm.email_verified).length;
  
  const toggleDM = (dmId) => {
    setSelectedDMs(prev =>
      prev.includes(dmId) ? prev.filter(id => id !== dmId) : [...prev, dmId]
    );
  };

  if (!decisionMakers || decisionMakers.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-600">No decision makers identified yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Decision Makers Identified: {decisionMakers.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {verifiedCount} email verified
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-lg gap-1.5">
              <Send className="w-3 h-3" /> Launch Outreach
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Launch Outreach Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3">
                  Select Recipients ({selectedDMs.length} selected)
                </p>
                <div className="space-y-2">
                  {decisionMakers.map(dm => (
                    <label key={dm.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedDMs.includes(dm.id)}
                        onChange={() => toggleDM(dm.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{dm.full_name}</p>
                        <p className="text-xs text-gray-500">{dm.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          {dm.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {dm.email_verified ? "✓" : "—"}</span>}
                          {dm.linkedin_url && <span className="flex items-center gap-1"><Linkedin className="w-3 h-3" /> LinkedIn</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <Button
                  onClick={() => {
                    onLaunchOutreach(selectedDMs);
                    setSelectedDMs([]);
                  }}
                  disabled={selectedDMs.length === 0}
                  className="w-full bg-[#FF9E4D] hover:bg-[#E8893D] text-white rounded-lg"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Launch to {selectedDMs.length} {selectedDMs.length === 1 ? "person" : "people"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {decisionMakers.slice(0, 3).map(dm => (
          <div key={dm.id} className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{dm.full_name}</p>
                <p className="text-xs text-gray-500">{dm.title}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {dm.email && (
                    <span className={`text-xs flex items-center gap-1 ${dm.email_verified ? "text-green-600" : "text-gray-500"}`}>
                      <Mail className="w-3 h-3" /> {dm.email_verified ? "verified" : "unverified"}
                    </span>
                  )}
                  {dm.linkedin_url && (
                    <a href={dm.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Linkedin className="w-3 h-3" /> LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {decisionMakers.length > 3 && (
        <button className="text-xs text-[#FF9E4D] font-semibold hover:underline">
          View all {decisionMakers.length} decision makers →
        </button>
      )}
    </div>
  );
}