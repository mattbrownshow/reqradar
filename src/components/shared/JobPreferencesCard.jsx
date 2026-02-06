import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, AlertCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function JobPreferencesCard() {
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedCompanySizes, setSelectedCompanySizes] = useState([]);
  const [targetRoles, setTargetRoles] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [preferredLocations, setPreferredLocations] = useState([]);
  const [newLocation, setNewLocation] = useState("");
  const [remotePreferred, setRemotePreferred] = useState(false);
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: () => base44.entities.CandidateProfile.list("-created_date", 1),
  });

  const profile = profiles[0];

  return (
    <>
      <div className="bg-gradient-to-br from-[#FFF5E6] to-white border-2 border-[#F7931E] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <h2 className="text-lg font-semibold text-gray-900">Your Job Search Preferences</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (profile) {
                setSelectedIndustries(profile.industries || []);
                setSelectedCompanySizes(profile.company_sizes || []);
                setTargetRoles(profile.target_roles || []);
                setPreferredLocations(profile.preferred_locations || []);
                setRemotePreferred(profile.remote_preferences?.includes("Remote") || false);
                setMinSalary(profile.min_salary?.toString() || "");
                setMaxSalary(profile.max_salary?.toString() || "");
              }
              setShowPreferencesModal(true);
            }}
            className="gap-2 rounded-lg"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </div>

        {profile ? (
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-semibold text-gray-600 min-w-[140px]">Target Roles:</span>
              <span className="text-sm text-gray-900">
                {profile.target_roles?.length > 0 ? profile.target_roles.join(", ") : "Not set"}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-semibold text-gray-600 min-w-[140px]">Industries:</span>
              <span className="text-sm text-gray-900">
                {profile.industries?.length > 0 ? profile.industries.join(", ") : "All industries"}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-semibold text-gray-600 min-w-[140px]">Location:</span>
              <span className="text-sm text-gray-900">
                {profile.preferred_locations?.length > 0
                  ? `${profile.preferred_locations.join(", ")}${profile.remote_preferences?.includes("Remote") ? " + Remote OK" : ""}`
                  : profile.remote_preferences?.includes("Remote") ? "Remote only" : "Any location"}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-semibold text-gray-600 min-w-[140px]">Salary Range:</span>
              <span className="text-sm text-gray-900">
                ${profile.min_salary?.toLocaleString() || "0"} - ${profile.max_salary?.toLocaleString() || "999,999"}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-semibold text-gray-600 min-w-[140px]">Company Size:</span>
              <span className="text-sm text-gray-900">
                {profile.company_sizes?.length > 0 ? profile.company_sizes.join(", ") : "All sizes"}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">Complete your profile to set job search preferences</p>
            <Link to={createPageUrl("CandidateSetup")}>
              <Button className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl">
                Set Up Profile
              </Button>
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 p-3 bg-yellow-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-xs text-yellow-800">
            These preferences control which jobs appear in your feed and RSS results
          </p>
        </div>
      </div>

      {/* Edit Preferences Modal */}
      <Dialog open={showPreferencesModal} onOpenChange={setShowPreferencesModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Search Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <p className="text-sm text-gray-500">
              Update your preferences to refine job matches and RSS feed results
            </p>

            {/* Target Roles */}
            <div>
              <Label className="text-base font-semibold">Target Roles *</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                The executive roles you're targeting
              </p>
              <div className="space-y-2">
                {targetRoles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {targetRoles.map((role, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-3 py-1.5 bg-[#FEF3E2] text-gray-800 rounded-lg text-sm">
                        {role}
                        <button
                          onClick={() => setTargetRoles(targetRoles.filter((_, i) => i !== idx))}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newRole.trim()) {
                        setTargetRoles([...targetRoles, newRole.trim()]);
                        setNewRole("");
                      }
                    }}
                    placeholder="Add a role (e.g., CFO, COO, CTO)"
                    className="rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newRole.trim()) {
                        setTargetRoles([...targetRoles, newRole.trim()]);
                        setNewRole("");
                      }
                    }}
                    className="rounded-lg"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Industries */}
            <div>
              <Label className="text-base font-semibold">Preferred Industries</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Select industries you're interested in (optional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {["Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Professional Services", "Energy", "Real Estate"].map(industry => (
                  <label key={industry} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={selectedIndustries.includes(industry)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIndustries([...selectedIndustries, industry]);
                        } else {
                          setSelectedIndustries(selectedIndustries.filter(i => i !== industry));
                        }
                      }}
                    />
                    <span className="text-sm">{industry}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Location Preferences */}
            <div>
              <Label className="text-base font-semibold">Location Preferences</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                Add cities or states where you'd like to work
              </p>
              <div className="space-y-3">
                {preferredLocations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {preferredLocations.map((loc, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-gray-800 rounded-lg text-sm">
                        {loc}
                        <button
                          onClick={() => setPreferredLocations(preferredLocations.filter((_, i) => i !== idx))}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newLocation.trim()) {
                        setPreferredLocations([...preferredLocations, newLocation.trim()]);
                        setNewLocation("");
                      }
                    }}
                    placeholder="Add a location (e.g., Seattle, WA)"
                    className="rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newLocation.trim()) {
                        setPreferredLocations([...preferredLocations, newLocation.trim()]);
                        setNewLocation("");
                      }
                    }}
                    className="rounded-lg"
                  >
                    Add
                  </Button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={remotePreferred}
                    onCheckedChange={setRemotePreferred}
                  />
                  <span className="text-sm">Open to remote work</span>
                </label>
              </div>
            </div>

            {/* Salary Range */}
            <div>
              <Label className="text-base font-semibold">Salary Range</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                Your target compensation range
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Minimum</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      value={minSalary}
                      onChange={e => setMinSalary(e.target.value)}
                      placeholder="170000"
                      className="pl-7 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Maximum</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      value={maxSalary}
                      onChange={e => setMaxSalary(e.target.value)}
                      placeholder="350000"
                      className="pl-7 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Company Size */}
            <div>
              <Label className="text-base font-semibold">Company Size (Employees)</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Select your preferred company sizes
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Startup (1-50)", value: "1-50" },
                  { label: "Small (51-200)", value: "51-200" },
                  { label: "Mid-size (201-1000)", value: "201-1000" },
                  { label: "Enterprise (1000+)", value: "1000+" }
                ].map(size => (
                  <label key={size.value} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={selectedCompanySizes.includes(size.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCompanySizes([...selectedCompanySizes, size.value]);
                        } else {
                          setSelectedCompanySizes(selectedCompanySizes.filter(s => s !== size.value));
                        }
                      }}
                    />
                    <span className="text-sm">{size.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPreferencesModal(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl"
                onClick={async () => {
                  if (profile) {
                    await base44.entities.CandidateProfile.update(profile.id, {
                      target_roles: targetRoles,
                      industries: selectedIndustries,
                      preferred_locations: preferredLocations,
                      remote_preferences: remotePreferred ? ["Remote"] : [],
                      min_salary: minSalary ? parseInt(minSalary) : undefined,
                      max_salary: maxSalary ? parseInt(maxSalary) : undefined,
                      company_sizes: selectedCompanySizes
                    });
                    window.location.reload();
                  }
                }}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}