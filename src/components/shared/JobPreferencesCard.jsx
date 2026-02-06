import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SearchableMultiSelect from "./SearchableMultiSelect";

const ROLES_DB = {
  'C-Suite': [
    'Chief Executive Officer (CEO)',
    'Chief Financial Officer (CFO)',
    'Chief Technology Officer (CTO)',
    'Chief Operating Officer (COO)',
    'Chief Marketing Officer (CMO)',
    'Chief Information Officer (CIO)',
    'Chief Human Resources Officer (CHRO)',
    'Chief Product Officer (CPO)',
    'Chief Revenue Officer (CRO)',
    'Chief Data Officer (CDO)',
    'Chief Security Officer (CSO)',
    'Chief Legal Officer / General Counsel'
  ],
  'VP Level': [
    'VP of Finance', 'VP of Engineering', 'VP of Sales',
    'VP of Marketing', 'VP of Operations', 'VP of Product',
    'VP of Human Resources', 'VP of Business Development',
    'VP of Customer Success'
  ],
  'Director Level': [
    'Director of Finance', 'Director of Engineering',
    'Director of Operations', 'Director of Marketing',
    'Director of Sales', 'Director of Product Management'
  ]
};

const INDUSTRIES_DB = [
  'Technology / Software / SaaS',
  'Healthcare / Biotech',
  'Financial Services / Fintech',
  'Manufacturing',
  'Retail / E-commerce',
  'Professional Services',
  'Real Estate / PropTech',
  'Energy / CleanTech',
  'Education / EdTech',
  'Media / Entertainment',
  'Telecommunications',
  'Transportation / Logistics',
  'Hospitality / Travel',
  'Agriculture / AgTech',
  'Construction',
  'Automotive',
  'Aerospace / Defense',
  'Consumer Goods',
  'Insurance / InsurTech',
  'Legal Services / LegalTech'
];

const US_CITIES = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL',
  'Houston, TX', 'Phoenix, AZ', 'Philadelphia, PA',
  'San Antonio, TX', 'San Diego, CA', 'Dallas, TX',
  'San Jose, CA', 'Austin, TX', 'Seattle, WA',
  'Denver, CO', 'Boston, MA', 'Portland, OR',
  'Atlanta, GA', 'Miami, FL', 'Minneapolis, MN',
  'San Francisco, CA', 'Detroit, MI', 'Nashville, TN',
  'Charlotte, NC', 'Washington, DC', 'Las Vegas, NV',
  'Baltimore, MD', 'Raleigh, NC', 'Salt Lake City, UT',
  'Tampa, FL', 'Orlando, FL', 'Cleveland, OH',
  'Pittsburgh, PA', 'Sacramento, CA', 'Kansas City, MO',
  'Indianapolis, IN', 'Columbus, OH', 'Milwaukee, WI'
];

export default function JobPreferencesCard() {
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [targetRoles, setTargetRoles] = useState([]);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [preferredLocations, setPreferredLocations] = useState([]);
  const [remotePreferred, setRemotePreferred] = useState(false);
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [selectedCompanySizes, setSelectedCompanySizes] = useState([]);
  const [selectedFundingStages, setSelectedFundingStages] = useState([]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: () => base44.entities.CandidateProfile.list("-created_date", 1),
  });

  const profile = profiles[0];

  const formatSalary = (value) => {
    if (!value) return "";
    return parseInt(value.replace(/,/g, '')).toLocaleString();
  };

  const handleSalaryChange = (value, setter) => {
    const numeric = value.replace(/,/g, '');
    if (numeric === '' || /^\d+$/.test(numeric)) {
      setter(numeric);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          if (profile) {
            setTargetRoles(profile.target_roles || []);
            setSelectedIndustries(profile.industries || []);
            setPreferredLocations(profile.preferred_locations || []);
            setRemotePreferred(profile.remote_preferences?.includes("Remote") || profile.remote_preferences?.includes("Fully Remote") || false);
            setMinSalary(profile.min_salary?.toString() || "");
            setMaxSalary(profile.max_salary?.toString() || "");
            setSelectedCompanySizes(profile.company_sizes || []);
            setSelectedFundingStages(profile.funding_stages || []);
          }
          setShowPreferencesModal(true);
        }}
        className="rounded-xl whitespace-nowrap"
      >
        View/Edit Job Search Preferences
      </Button>

      {/* Edit Preferences Modal */}
      <Dialog open={showPreferencesModal} onOpenChange={setShowPreferencesModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <p className="text-xs text-gray-500 mt-1 mb-3">
                The executive roles you're targeting
              </p>
              <SearchableMultiSelect
                items={[]}
                groupedBy={ROLES_DB}
                selected={targetRoles}
                onSelect={(role) => setTargetRoles([...targetRoles, role])}
                onRemove={(role) => setTargetRoles(targetRoles.filter(r => r !== role))}
                placeholder="Search roles (e.g., CFO, CTO, VP Finance)..."
              />
              <p className="text-xs text-gray-500 mt-2">💡 Select from common roles or type to search</p>
            </div>

            {/* Industries */}
            <div>
              <Label className="text-base font-semibold">Preferred Industries</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Optional - leave blank for all industries
              </p>
              <SearchableMultiSelect
                items={INDUSTRIES_DB}
                selected={selectedIndustries}
                onSelect={(industry) => setSelectedIndustries([...selectedIndustries, industry])}
                onRemove={(industry) => setSelectedIndustries(selectedIndustries.filter(i => i !== industry))}
                placeholder="Search industries (e.g., Technology, Healthcare)..."
              />
            </div>

            {/* Location Preferences */}
            <div>
              <Label className="text-base font-semibold">Location Preferences</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Where you're willing to work
              </p>
              <SearchableMultiSelect
                items={US_CITIES}
                selected={preferredLocations}
                onSelect={(city) => setPreferredLocations([...preferredLocations, city])}
                onRemove={(city) => setPreferredLocations(preferredLocations.filter(c => c !== city))}
                placeholder="Search cities (e.g., Seattle, San Francisco, New York)..."
              />
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <Checkbox
                  checked={remotePreferred}
                  onCheckedChange={setRemotePreferred}
                />
                <span className="text-sm">☑ Open to Remote Work</span>
              </label>
            </div>

            {/* Salary Range */}
            <div>
              <Label className="text-base font-semibold">Target Salary Range</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                Your desired compensation range
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Minimum</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      value={minSalary ? parseInt(minSalary).toLocaleString() : ""}
                      onChange={e => handleSalaryChange(e.target.value, setMinSalary)}
                      placeholder="170,000"
                      className="pl-7 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Maximum</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      value={maxSalary ? parseInt(maxSalary).toLocaleString() : ""}
                      onChange={e => handleSalaryChange(e.target.value, setMaxSalary)}
                      placeholder="350,000"
                      className="pl-7 rounded-xl"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">💡 System shows roles within ±20% of this range</p>
            </div>

            {/* Company Size */}
            <div>
              <Label className="text-base font-semibold">Company Size (Employees)</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Select all that apply
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Startup", sublabel: "1-50 employees", value: "1-50" },
                  { label: "Small Company", sublabel: "51-200 employees", value: "51-200" },
                  { label: "Mid-Size", sublabel: "201-1000 employees", value: "201-1000" },
                  { label: "Enterprise", sublabel: "1000+ employees", value: "1000+" }
                ].map(size => (
                  <label key={size.value} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    selectedCompanySizes.includes(size.value) 
                      ? "border-[#F7931E] bg-[#FEF3E2]" 
                      : "border-gray-200 hover:bg-gray-50"
                  }`}>
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
                    <div>
                      <div className="text-sm font-medium">{size.label}</div>
                      <div className="text-xs text-gray-500">{size.sublabel}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Funding Stage */}
            <div>
              <Label className="text-base font-semibold">Company Funding Stage</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Optional - filter by fundraising stage
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Bootstrapped", sublabel: "Self-funded", value: "Bootstrapped" },
                  { label: "Seed", sublabel: "Early funding", value: "Seed" },
                  { label: "Series A", sublabel: "$2-15M", value: "Series A" },
                  { label: "Series B", sublabel: "$15-50M", value: "Series B" },
                  { label: "Series C+", sublabel: "$50M+", value: "Series C+" },
                  { label: "Public", sublabel: "IPO", value: "Public" }
                ].map(stage => (
                  <label key={stage.value} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    selectedFundingStages.includes(stage.value) 
                      ? "border-[#F7931E] bg-[#FEF3E2]" 
                      : "border-gray-200 hover:bg-gray-50"
                  }`}>
                    <Checkbox
                      checked={selectedFundingStages.includes(stage.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFundingStages([...selectedFundingStages, stage.value]);
                        } else {
                          setSelectedFundingStages(selectedFundingStages.filter(s => s !== stage.value));
                        }
                      }}
                    />
                    <div>
                      <div className="text-sm font-medium">{stage.label}</div>
                      <div className="text-xs text-gray-500">{stage.sublabel}</div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">💡 Leave blank to see companies at all funding stages</p>
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
                      remote_preferences: remotePreferred ? ["Fully Remote"] : [],
                      min_salary: minSalary ? parseInt(minSalary) : undefined,
                      max_salary: maxSalary ? parseInt(maxSalary) : undefined,
                      company_sizes: selectedCompanySizes,
                      funding_stages: selectedFundingStages
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