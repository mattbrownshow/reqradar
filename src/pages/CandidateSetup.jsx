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

const ROLES_DB = {
  'C-Suite': [
    'Chief Executive Officer (CEO)', 'Chief Financial Officer (CFO)',
    'Chief Technology Officer (CTO)', 'Chief Operating Officer (COO)',
    'Chief Marketing Officer (CMO)', 'Chief Information Officer (CIO)',
    'Chief Human Resources Officer (CHRO)', 'Chief Product Officer (CPO)',
    'Chief Revenue Officer (CRO)', 'Chief Data Officer (CDO)'
  ],
  'VP Level': [
    'VP of Finance', 'VP of Engineering', 'VP of Sales',
    'VP of Marketing', 'VP of Operations', 'VP of Product'
  ],
  'Director Level': [
    'Director of Finance', 'Director of Engineering',
    'Director of Operations', 'Director of Marketing'
  ]
};

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
    resume_url: "", current_location: "", current_title: "",
    target_roles: [], location_type: "remote_only", preferred_locations: [],
    setup_complete: false
  });



  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  const { data: existingProfiles } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: () => base44.entities.CandidateProfile.list("-created_date", 1),
    enabled: isAuthenticated,
  });

  const profiles = existingProfiles || [];

  useEffect(() => {
    if (profiles.length > 0) {
      const p = profiles[0];
      setProfile(p);
    } else if (user) {
      // Pre-populate name and email from auth
      setProfile(prev => ({
        ...prev,
        full_name: user.full_name || '',
        email: user.email || ''
      }));
    }
  }, [profiles.length, user?.email]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (profiles.length > 0) {
        return base44.entities.CandidateProfile.update(profiles[0].id, data);
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

  const totalSteps = 3;

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
                  <p className="text-xs text-gray-500 mt-1 mb-3">Search or add custom roles</p>
                  <SearchableMultiSelect
                    items={[]}
                    groupedBy={ROLES_DB}
                    selected={profile.target_roles || []}
                    onSelect={(role) => setProfile(p => ({ ...p, target_roles: [...(p.target_roles || []), role] }))}
                    onRemove={(role) => removeFromList("target_roles", role)}
                    placeholder="Search roles (e.g., CFO, CTO, VP Finance)..."
                    allowCustom={true}
                  />
                </div>
            </div>
          )}

          {/* Step 2: Location Preferences */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Location Preferences</h2>
              <p className="text-sm text-gray-500">Where are you willing to work?</p>

              <div>
                <Label className="text-base font-semibold">Remote Work Preferences</Label>
                <RadioGroup value={profile.location_type || "remote_only"} onValueChange={v => setProfile(p => ({ ...p, location_type: v }))} className="mt-3 space-y-2">
                  <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="remote_only" />
                    <div>
                      <p className="font-medium text-gray-900">Remote Only</p>
                      <p className="text-xs text-gray-500 mt-0.5">Only show remote positions</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="specific_locations" />
                    <div>
                      <p className="font-medium text-gray-900">Specific Locations</p>
                      <p className="text-xs text-gray-500 mt-0.5">Jobs in certain cities/states</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="both" />
                    <div>
                      <p className="font-medium text-gray-900">Both Remote and On-site</p>
                      <p className="text-xs text-gray-500 mt-0.5">Show all opportunities</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {(profile.location_type === "specific_locations" || profile.location_type === "both") && (
                <div>
                  <Label className="text-base font-semibold">Specific Locations</Label>
                  <p className="text-xs text-gray-500 mt-1 mb-3">Enter cities/states you're interested in</p>
                  <SearchableMultiSelect
                    items={US_CITIES}
                    selected={profile.preferred_locations || []}
                    onSelect={(city) => setProfile(p => ({ ...p, preferred_locations: [...(p.preferred_locations || []), city] }))}
                    onRemove={(city) => setProfile(p => ({ ...p, preferred_locations: (p.preferred_locations || []).filter(c => c !== city) }))}
                    placeholder="Search cities..."
                  />
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-800">
                  ℹ️ We'll search job boards matching your target roles and location preferences. All jobs from RSS feeds will appear in your discovery feed.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Complete Setup */}
          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">You're All Set! 🎉</h2>
              <p className="text-gray-600">We'll start searching for opportunities that match your preferences</p>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-left space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Target Roles:</h3>
                  <div className="flex flex-wrap gap-2">
                    {(profile.target_roles || []).map(role => (
                      <Badge key={role} className="bg-orange-100 text-orange-800 border-orange-200">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Location:</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.location_type === "remote_only" && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">Remote jobs</Badge>
                    )}
                    {profile.location_type === "specific_locations" && (profile.preferred_locations || []).length > 0 && (
                      (profile.preferred_locations || []).map(loc => (
                        <Badge key={loc} className="bg-blue-100 text-blue-800 border-blue-200">{loc}</Badge>
                      ))
                    )}
                    {profile.location_type === "both" && (
                      <>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">Remote jobs</Badge>
                        {(profile.preferred_locations || []).map(loc => (
                          <Badge key={loc} className="bg-blue-100 text-blue-800 border-blue-200">{loc}</Badge>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Next Steps:</h3>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-orange-600 shrink-0">1.</span>
                    <span>We'll monitor job boards for matches</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-orange-600 shrink-0">2.</span>
                    <span>New jobs appear in your Discovery feed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-orange-600 shrink-0">3.</span>
                    <span>Save interesting jobs to your pipeline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-orange-600 shrink-0">4.</span>
                    <span>Research companies and find decision makers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-orange-600 shrink-0">5.</span>
                    <span>Draft personalized outreach</span>
                  </li>
                </ol>
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