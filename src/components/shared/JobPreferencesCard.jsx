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

  if (!profile) {
    return (
      <Link to={createPageUrl("Settings") + "?tab=job-search"}>
        <Button variant="outline" className="rounded-xl gap-2">
          <Edit className="w-4 h-4" /> Set Up Job Preferences
        </Button>
      </Link>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Your Job Search Preferences</h3>
          <p className="text-xs text-gray-500 mt-1">Last updated: {new Date(profile.updated_date || Date.now()).toLocaleDateString()}</p>
        </div>
        <Link to={createPageUrl("Settings") + "?tab=job-search"}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-[#F7931E] hover:text-[#E07A0A] hover:bg-orange-50">
            <Edit className="w-3.5 h-3.5" /> Edit in Settings
          </Button>
        </Link>
      </div>

      <div className="space-y-2 text-sm">
        {profile.target_roles?.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500 shrink-0">• Targeting:</span>
            <span className="text-gray-900 font-medium">{profile.target_roles.slice(0, 2).join(", ")}{profile.target_roles.length > 2 && ` +${profile.target_roles.length - 2} more`}</span>
          </div>
        )}
        {profile.industries?.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500 shrink-0">• Industries:</span>
            <span className="text-gray-900">{profile.industries.slice(0, 2).join(", ")}{profile.industries.length > 2 && ` +${profile.industries.length - 2} more`}</span>
          </div>
        )}
        {profile.preferred_locations?.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500 shrink-0">• Location:</span>
            <span className="text-gray-900">{profile.preferred_locations.slice(0, 2).join(", ")}{profile.preferred_locations.length > 2 && ` +${profile.preferred_locations.length - 2} more`}</span>
          </div>
        )}
        {profile.remote_preferences?.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500 shrink-0">• Remote:</span>
            <span className="text-gray-900">{profile.remote_preferences.join(", ")}</span>
          </div>
        )}
        {profile.min_salary && profile.max_salary && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500 shrink-0">• Salary:</span>
            <span className="text-gray-900">${profile.min_salary.toLocaleString()} - ${profile.max_salary.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}