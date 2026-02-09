import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Upload, X, FileText, ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import SearchableMultiSelect from "../components/shared/SearchableMultiSelect";

const INDUSTRIES = [
  "Technology / SaaS", "Healthcare", "Financial Services", "Manufacturing",
  "Retail / E-commerce", "Professional Services", "Energy", "Real Estate",
  "Education", "Media & Entertainment", "Transportation & Logistics",
  "Telecommunications", "Agriculture", "Government", "Hospitality",
  "Insurance", "Pharmaceuticals", "Automotive", "Aerospace & Defense", "Nonprofit"
];

const COMPANY_SIZES = [
  "Startup ($1M - $10M)", "Growth ($10M - $50M)", "Mid-Market ($50M - $500M)",
  "Enterprise ($500M - $1B)", "Large Enterprise ($1B+)"
];

const EMPLOYEE_COUNTS = [
  "1-10 employees",
  "11-50 employees", 
  "51-200 employees",
  "201-500 employees",
  "501-1,000 employees",
  "1,001-5,000 employees",
  "5,001-10,000 employees",
  "10,000+ employees"
];

const DEPARTMENTS = [
  "Executive / Leadership",
  "Engineering / Technology",
  "Product",
  "Sales / Revenue",
  "Marketing",
  "Finance",
  "Operations",
  "Human Resources / Talent",
  "Legal"
];

const SENIORITY_LEVELS = [
  "Founder / Owner",
  "C-Suite",
  "Partner",
  "Vice President",
  "Head",
  "Director",
  "Manager"
];

const AVAILABILITY_OPTIONS = [
  "Immediately (within 1 week)", "2 weeks notice required",
  "4 weeks notice required", "6-8 weeks notice required", "Flexible timing"
];

const US_CITIES = [
  "New York, NY", "Los Angeles, CA", "San Francisco, CA", "Chicago, IL",
  "Houston, TX", "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX",
  "San Diego, CA", "Dallas, TX", "San Jose, CA", "Austin, TX",
  "Jacksonville, FL", "Fort Worth, TX", "Columbus, OH", "Charlotte, NC",
  "San Francisco Bay Area, CA", "Seattle, WA", "Denver, CO", "Boston, MA",
  "Portland, OR", "Las Vegas, NV", "Detroit, MI", "Nashville, TN",
  "Oklahoma City, OK", "El Paso, TX", "Washington, DC", "Las Vegas, NV",
  "Louisville, KY", "Baltimore, MD", "Milwaukee, WI", "Albuquerque, NM",
  "Tucson, AZ", "Fresno, CA", "Mesa, AZ", "Sacramento, CA",
  "Atlanta, GA", "Kansas City, MO", "Colorado Springs, CO", "Raleigh, NC",
  "Miami, FL", "Long Beach, CA", "Virginia Beach, VA", "Omaha, NE",
  "Oakland, CA", "Minneapolis, MN", "Tulsa, OK", "Tampa, FL",
  "Arlington, TX", "New Orleans, LA", "Wichita, KS", "Cleveland, OH"
];

export default function CandidateSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    base44.auth.isAuthenticated().then(setIsAuthenticated);
  }, [step]);

  const [profile, setProfile] = useState({
    full_name: "", email: "", phone: "", linkedin_url: "",
    resume_url: "", current_location: "", preferred_locations: [],
    target_roles: [], skills: [], years_experience: 0,
    education: "", previous_employers: [], current_title: "",
    min_salary: 150000, max_salary: 350000,
    remote_preferences: [], geographic_radius: 50,
    company_sizes: [], employee_counts: [],
    target_departments: [], target_seniority_levels: [], availability: "",
    industries: [], funding_stages: [], setup_complete: false
  });

  const [locationInput, setLocationInput] = useState("");
  const [roleInput, setRoleInput] = useState("");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  const { data: existingProfiles = [] } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: () => base44.entities.CandidateProfile.list("-created_date", 1),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (existingProfiles.length > 0) {
      const p = existingProfiles[0];
      setProfile(prev => ({ ...prev, ...p }));
    } else if (user) {
      // Pre-populate name and email from auth
      setProfile(prev => ({
        ...prev,
        full_name: user.full_name || '',
        email: user.email || ''
      }));
    }
  }, [existingProfiles, user]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingProfiles.length > 0) {
        return base44.entities.CandidateProfile.update(existingProfiles[0].id, data);
      }
      return base44.entities.CandidateProfile.create(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidateProfile"] }),
  });

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfile(prev => ({ ...prev, resume_url: file_url, resume_filename: file.name }));
      setIsUploading(false);

      // Extract data from resume
      setIsExtracting(true);
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            full_name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            current_title: { type: "string" },
            current_location: { type: "string" },
            years_experience: { type: "number" },
            education: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            previous_employers: { type: "array", items: { type: "string" } },
            target_roles: { type: "array", items: { type: "string" } }
          }
        }
      });
      
      if (result.status === "success" && result.output) {
        const d = result.output;
        setProfile(prev => ({
          ...prev,
          full_name: d.full_name || prev.full_name,
          email: d.email || prev.email,
          phone: d.phone || prev.phone,
          current_title: d.current_title || prev.current_title,
          current_location: d.current_location || prev.current_location,
          years_experience: d.years_experience || prev.years_experience,
          education: d.education || prev.education,
          skills: d.skills || prev.skills,
          previous_employers: d.previous_employers || prev.previous_employers,
          target_roles: d.target_roles || prev.target_roles,
        }));
      }
    } catch (error) {
      console.error("Resume extraction failed:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFinish = async () => {
    try {
      await saveMutation.mutateAsync({ ...profile, setup_complete: true });
      
      // Auto-create default RSS feeds for new user
      try {
        await base44.functions.invoke('createDefaultFeeds', {});
      } catch (error) {
        console.error('Failed to create default feeds:', error);
      }

      // Trigger initial discovery run
      try {
        await base44.functions.invoke('runDailyDiscovery', {});
      } catch (error) {
        console.error('Failed to run initial discovery:', error);
      }
      
      // Use hard redirect to ensure fresh page load
      window.location.href = createPageUrl("Dashboard");
    } catch (error) {
      console.error('Finish setup failed:', error);
      alert('Failed to complete setup. Please try again.');
    }
  };

  const handleSaveStep = () => {
    saveMutation.mutate(profile);
  };

  const addToList = (key, value, setInput) => {
    if (value.trim() && !(profile[key] || []).includes(value.trim())) {
      setProfile(prev => ({ ...prev, [key]: [...(prev[key] || []), value.trim()] }));
      setInput("");
    }
  };

  const removeFromList = (key, value) => {
    setProfile(prev => ({ ...prev, [key]: prev[key].filter(v => v !== value) }));
  };

  const toggleInList = (key, value) => {
    setProfile(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }));
  };

  const totalSteps = 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF3E2] via-white to-orange-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69874d93ef5c22ad8b35ad6f/1b28eb63c_Screenshot2026-02-08at85127AM.png" alt="ReqRadar" className="h-10 mx-auto" />
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Complete Your Profile
          </h1>
          <p className="mt-2 text-gray-500">Step {step} of {totalSteps}</p>
          {/* Progress */}
          <div className="mt-6 flex gap-1.5 justify-center">
            {Array.from({ length: totalSteps }, (_, i) => (
              <button
                key={i}
                onClick={() => {
                  handleSaveStep();
                  setStep(i + 1);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer hover:opacity-80 ${
                  i + 1 <= step ? "bg-[#F7931E] w-10" : "bg-gray-200 w-6"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10">
          {/* Step 1: Resume + Target Roles */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Resume & Target Roles</h2>
                <p className="text-sm text-gray-500">Upload your resume and we'll auto-populate your profile</p>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-[#F7931E] transition-colors">
                  {profile.resume_url ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <FileText className="w-7 h-7 text-emerald-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">{profile.resume_filename || 'Resume uploaded'}</p>
                      <label className="text-sm text-[#F7931E] cursor-pointer hover:underline">
                        Replace file
                        <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-3">
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 text-[#F7931E] animate-spin" />
                      ) : (
                        <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center">
                          <Upload className="w-7 h-7 text-[#F7931E]" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {isUploading ? "Uploading..." : "Click to upload resume (PDF or DOCX)"}
                      </span>
                      <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
                    </label>
                  )}
                </div>
                {isExtracting && (
                  <div className="flex items-center gap-2 text-sm text-[#F7931E]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting profile data from resume...
                  </div>
                )}
                {/* Target Roles */}
                <div>
                  <Label>Target Executive Roles</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input value={roleInput} onChange={e => setRoleInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addToList("target_roles", roleInput, setRoleInput))} className="rounded-xl" placeholder="e.g., Chief Financial Officer (CFO)" />
                    <Button type="button" onClick={() => addToList("target_roles", roleInput, setRoleInput)} variant="outline" className="rounded-xl shrink-0">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(profile.target_roles || []).map(role => (
                      <Badge key={role} variant="secondary" className="bg-orange-50 text-[#F7931E] rounded-lg py-1 px-3 gap-1">
                        {role}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromList("target_roles", role)} />
                      </Badge>
                    ))}
                  </div>
                </div>
            </div>
          )}

          {/* Step 2: Compensation + Location + Availability */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Compensation Requirements</h2>
                <div className="space-y-4">
                  <div>
                    <Label>Minimum Salary</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="number"
                        value={profile.min_salary || 150000}
                        onChange={(e) => setProfile(p => ({ ...p, min_salary: parseInt(e.target.value) || 0 }))}
                        className="rounded-xl pl-7"
                        placeholder="150000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Maximum Salary</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="number"
                        value={profile.max_salary || 350000}
                        onChange={(e) => setProfile(p => ({ ...p, max_salary: parseInt(e.target.value) || 0 }))}
                        className="rounded-xl pl-7"
                        placeholder="350000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-8 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Location Preferences</h2>
                <div>
                  <Label>Preferred Hiring Locations</Label>
                  <div className="mt-1.5">
                    <SearchableMultiSelect
                      items={US_CITIES}
                      selected={profile.preferred_locations || []}
                      onSelect={(city) => setProfile(p => ({ ...p, preferred_locations: [...(p.preferred_locations || []), city] }))}
                      onRemove={(city) => setProfile(p => ({ ...p, preferred_locations: (p.preferred_locations || []).filter(c => c !== city) }))}
                      placeholder="Search cities..."
                    />
                  </div>
                </div>
                <div>
                  <Label>Remote Work Preferences</Label>
                  <div className="mt-2 space-y-2">
                    {["Fully Remote", "Hybrid (2-3 days/week)", "Relocation Considered"].map(opt => (
                      <label key={opt} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                        <Checkbox checked={(profile.remote_preferences || []).includes(opt)} onCheckedChange={() => toggleInList("remote_preferences", opt)} />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-8 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Availability</h2>
                <RadioGroup value={profile.availability} onValueChange={v => setProfile(p => ({ ...p, availability: v }))} className="space-y-2">
                  {AVAILABILITY_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value={opt} />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 3: Company Preferences */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Company Preferences</h2>
              <div>
                <Label>Revenue Range</Label>
                <div className="mt-2 space-y-2">
                  {COMPANY_SIZES.map(size => (
                    <label key={size} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <Checkbox checked={(profile.company_sizes || []).includes(size)} onCheckedChange={() => toggleInList("company_sizes", size)} />
                      <span className="text-sm text-gray-700">{size}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Employee Count</Label>
                <div className="mt-2 space-y-2">
                  {EMPLOYEE_COUNTS.map(ec => (
                    <label key={ec} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <Checkbox checked={(profile.employee_counts || []).includes(ec)} onCheckedChange={() => toggleInList("employee_counts", ec)} />
                      <span className="text-sm text-gray-700">{ec}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Decision Makers You'd Like To Reach At Hiring Companies</Label>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Select the departments and seniority levels you want to target. We'll find matching contacts at every company.
                </p>
                
                <div className="space-y-6">
                  {/* Departments */}
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-gray-900 mb-3">Departments</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DEPARTMENTS.map(dept => (
                        <label key={dept} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <Checkbox 
                            checked={(profile.target_departments || []).includes(dept)} 
                            onCheckedChange={() => toggleInList("target_departments", dept)} 
                          />
                          <span className="text-sm font-medium text-gray-700">{dept}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Seniority Levels */}
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-gray-900 mb-3">Seniority Levels</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SENIORITY_LEVELS.map(level => (
                        <label key={level} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <Checkbox 
                            checked={(profile.target_seniority_levels || []).includes(level)} 
                            onCheckedChange={() => toggleInList("target_seniority_levels", level)} 
                          />
                          <span className="text-sm font-medium text-gray-700">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {((profile.target_departments || []).length > 0 || (profile.target_seniority_levels || []).length > 0) && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-sm text-emerald-800">
                      ✓ <strong>{(profile.target_departments || []).length} departments</strong> and <strong>{(profile.target_seniority_levels || []).length} seniority levels selected</strong> — We'll search for matching contacts at every target company.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Industries & Funding */}
          {step === 4 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Industry Preferences</h2>
                <p className="text-sm text-gray-500 mb-3">Select all industries that interest you</p>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors bg-gray-50 mb-3 font-medium">
                  <Checkbox 
                    checked={(profile.industries || []).length === INDUSTRIES.length} 
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setProfile(prev => ({ ...prev, industries: INDUSTRIES }));
                      } else {
                        setProfile(prev => ({ ...prev, industries: [] }));
                      }
                    }} 
                  />
                  <span className="text-sm text-gray-900">All industries</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {INDUSTRIES.map(ind => (
                    <label key={ind} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <Checkbox checked={(profile.industries || []).includes(ind)} onCheckedChange={() => toggleInList("industries", ind)} />
                      <span className="text-sm text-gray-700">{ind}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900">Funding Types</h2>
                <p className="text-sm text-gray-500 mb-3">Optional - Select preferred company funding types</p>
                <div className="space-y-2">
                  {[
                    "Pre seed",
                    "Seed",
                    "Series A",
                    "Series B",
                    "Series C",
                    "Series D",
                    "Series E-J",
                    "Other"
                  ].map(stage => (
                    <label key={stage} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <Checkbox checked={(profile.funding_stages || []).includes(stage)} onCheckedChange={() => toggleInList("funding_stages", stage)} />
                      <span className="text-sm text-gray-700">{stage}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => { handleSaveStep(); setStep(s => s - 1); }} className="gap-2 rounded-xl text-gray-500">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            ) : (
              <div />
            )}
            {step < totalSteps ? (
              <Button onClick={() => { handleSaveStep(); setStep(s => s + 1); }} className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Complete Setup & Find Opportunities
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}