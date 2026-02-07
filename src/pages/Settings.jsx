import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  User, Bell, Sliders, Shield, Save, Loader2, LogOut, Briefcase, Upload, FileText, ExternalLink, ChevronRight, Trash2
} from "lucide-react";
import SearchableMultiSelect from "../components/shared/SearchableMultiSelect";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function Settings() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [autoApplySettings, setAutoApplySettings] = useState({
    daily_limit: 10,
    match_threshold: 70,
    email_signature: ""
  });

  const [profileVisibility, setProfileVisibility] = useState("private");
  const [considerOptions, setConsiderOptions] = useState({
    hybrid: true,
    contract: true,
    parttime: false
  });

  const [jobSearchPrefs, setJobSearchPrefs] = useState({
    target_roles: [],
    industries: [],
    preferred_locations: [],
    remote_preferences: [],
    min_salary: 150000,
    max_salary: 350000,
    company_sizes: [],
    funding_stages: [],
    ideal_decision_maker: "",
    availability: ""
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: () => base44.entities.CandidateProfile.list("-created_date", 1),
  });

  const profile = profiles[0] || {};

  React.useEffect(() => {
    if (profile.id) {
      setJobSearchPrefs({
        target_roles: profile.target_roles || [],
        industries: profile.industries || [],
        preferred_locations: profile.preferred_locations || [],
        remote_preferences: profile.remote_preferences || [],
        min_salary: profile.min_salary || 150000,
        max_salary: profile.max_salary || 350000,
        company_sizes: profile.company_sizes || [],
        funding_stages: profile.funding_stages || [],
        ideal_decision_maker: profile.ideal_decision_maker || "",
        availability: profile.availability || ""
      });
    }
  }, [profile.id]);

  const saveJobSearchMutation = useMutation({
    mutationFn: async () => {
      if (!profile.id) throw new Error('No profile found');
      await base44.entities.CandidateProfile.update(profile.id, jobSearchPrefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidateProfile"] });
    }
  });

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

  const INDUSTRIES_DB = [
    'Technology / Software / SaaS', 'Healthcare / Biotech',
    'Financial Services / Fintech', 'Manufacturing',
    'Retail / E-commerce', 'Professional Services'
  ];

  const US_CITIES = [
    'New York, NY', 'Los Angeles, CA', 'San Francisco, CA',
    'Seattle, WA', 'Austin, TX', 'Boston, MA', 'Denver, CO'
  ];

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingResume(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (profile.id) {
        await base44.entities.CandidateProfile.update(profile.id, { resume_url: file_url });
        queryClient.invalidateQueries({ queryKey: ["candidateProfile"] });
      }
    } catch (error) {
      console.error('Resume upload failed:', error);
    }
    setIsUploadingResume(false);
  };

  return (
    <div className="px-4 sm:px-6 py-8 lg:py-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Update your target roles, industries, salary range, and company preferences.</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="bg-gray-100 rounded-xl p-1">
            <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              <User className="w-4 h-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="job-search" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              <Briefcase className="w-4 h-4" /> Job Search
            </TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              <Sliders className="w-4 h-4" /> Preferences
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              <Bell className="w-4 h-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              <Shield className="w-4 h-4" /> Privacy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-6">
            {/* Account Information */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Account Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm text-gray-500">Name</Label>
                  <p className="text-gray-900 mt-1 font-medium">{user?.full_name || profile.full_name || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Email</Label>
                  <p className="text-gray-900 mt-1 font-medium">{user?.email || profile.email || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Phone</Label>
                  <p className="text-gray-900 mt-1 font-medium">{profile.phone || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Current Title</Label>
                  <p className="text-gray-900 mt-1 font-medium">{profile.current_title || "—"}</p>
                </div>
              </div>
            </div>

            {/* Resume Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Resume</h3>
              {profile.resume_url ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">📄 Resume uploaded</p>
                      <p className="text-xs text-gray-500 mt-0.5">Last updated: {new Date(profile.updated_date || Date.now()).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={profile.resume_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                        View
                      </Button>
                    </a>
                    <label>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" disabled={isUploadingResume}>
                        {isUploadingResume ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                        ) : (
                          <>Replace</>
                        )}
                      </Button>
                      <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#FF9E4D] transition-colors">
                  {isUploadingResume ? (
                    <Loader2 className="w-8 h-8 text-[#FF9E4D] animate-spin mb-3" />
                  ) : (
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-[#FF9E4D]" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {isUploadingResume ? "Uploading..." : "Click to upload resume (PDF or DOCX)"}
                  </span>
                  <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
                </label>
              )}
              <Link to={createPageUrl("CandidateSetup")}>
                <Button variant="outline" className="rounded-xl gap-2">
                  Edit Full Profile
                </Button>
              </Link>
            </div>

            {/* Professional Profile */}
            <details className="bg-white border border-gray-200 rounded-2xl p-6">
              <summary className="font-bold text-gray-900 text-lg flex items-center justify-between cursor-pointer">
                Professional Profile
                <Link to={createPageUrl("CandidateSetup")} onClick={(e) => e.stopPropagation()} className="text-[#FF9E4D] hover:underline text-sm font-semibold flex items-center gap-1">
                  Edit <ChevronRight className="w-4 h-4" />
                </Link>
              </summary>
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">Current Company:</span>
                    <p className="font-medium text-gray-900">{profile.previous_employers?.[0] || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Years of Experience:</span>
                    <p className="font-medium text-gray-900">{profile.years_experience ? `${profile.years_experience}+` : "—"}</p>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">LinkedIn:</span>
                  <p className="font-medium text-gray-900">{profile.linkedin_url ? <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Connected</a> : "Not connected"}</p>
                </div>
                {profile.skills && profile.skills.length > 0 && (
                  <div>
                    <p className="text-gray-500 mb-2">Key Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.slice(0, 6).map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>

            {/* Career Objectives */}
            <details className="bg-white border border-gray-200 rounded-2xl p-6">
              <summary className="font-bold text-gray-900 text-lg flex items-center justify-between cursor-pointer">
                Career Objectives
                <Link to={createPageUrl("Settings")} onClick={(e) => { e.stopPropagation(); document.querySelector('[value="job-search"]')?.click(); }} className="text-[#FF9E4D] hover:underline text-sm font-semibold flex items-center gap-1">
                  Edit <ChevronRight className="w-4 h-4" />
                </Link>
              </summary>
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">Target Role:</span>
                    <p className="font-medium text-gray-900">{jobSearchPrefs.target_roles?.[0] || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Preferred Industries:</span>
                    <p className="font-medium text-gray-900">{jobSearchPrefs.industries?.join(", ") || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Remote Preference:</span>
                    <p className="font-medium text-gray-900">{jobSearchPrefs.remote_preferences?.[0] || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Salary Range:</span>
                    <p className="font-medium text-gray-900">
                      ${jobSearchPrefs.min_salary?.toLocaleString() || "—"} - ${jobSearchPrefs.max_salary?.toLocaleString() || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Location:</span>
                    <p className="font-medium text-gray-900">{jobSearchPrefs.preferred_locations?.[0] || "Open to relocation"}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-gray-500 mb-2">Willing to consider:</p>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={considerOptions.hybrid} onCheckedChange={(c) => setConsiderOptions(p => ({ ...p, hybrid: c }))} />
                      <span className="text-sm">Hybrid roles</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={considerOptions.contract} onCheckedChange={(c) => setConsiderOptions(p => ({ ...p, contract: c }))} />
                      <span className="text-sm">Contract-to-hire</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={considerOptions.parttime} onCheckedChange={(c) => setConsiderOptions(p => ({ ...p, parttime: c }))} />
                      <span className="text-sm">Part-time/fractional roles</span>
                    </label>
                  </div>
                </div>
              </div>
            </details>

            {/* Profile Visibility */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Profile Visibility</h3>
              <RadioGroup value={profileVisibility} onValueChange={setProfileVisibility}>
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="public" />
                  <div>
                    <p className="font-medium text-gray-900">Public</p>
                    <p className="text-xs text-gray-500 mt-0.5">Visible to recruiters and hiring managers</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="private" />
                  <div>
                    <p className="font-medium text-gray-900">Private</p>
                    <p className="text-xs text-gray-500 mt-0.5">Only visible when you apply or reach out</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="stealth" />
                  <div>
                    <p className="font-medium text-gray-900">Stealth</p>
                    <p className="text-xs text-gray-500 mt-0.5">Completely hidden (use for passive searches)</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Connected Accounts */}
            <details className="bg-white border border-gray-200 rounded-2xl p-6">
              <summary className="font-bold text-gray-900 text-lg flex items-center justify-between cursor-pointer">
                Connected Accounts
                <span className="text-[#FF9E4D] hover:underline text-sm font-semibold flex items-center gap-1">
                  Manage <ChevronRight className="w-4 h-4" />
                </span>
              </summary>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                  <span className="text-sm font-medium text-gray-900">LinkedIn:</span>
                  <Button variant="outline" size="sm" className="rounded-lg">Connect</Button>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                  <span className="text-sm font-medium text-gray-900">Google Calendar:</span>
                  <Button variant="outline" size="sm" className="rounded-lg text-red-600 hover:text-red-700">Disconnect</Button>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                  <span className="text-sm font-medium text-gray-900">Email:</span>
                  <span className="text-sm text-gray-600">{user?.email || "—"}</span>
                </div>
              </div>
            </details>

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Danger Zone</h3>
              <p className="text-sm text-gray-600">
                Warning: This will permanently delete all your data including saved jobs, applications, and outreach campaigns.
              </p>
              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Account
              </Button>
            </div>
          </TabsContent>

        <TabsContent value="job-search" className="mt-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 space-y-8 max-w-4xl">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Job Search Preferences</h3>
              <p className="text-sm text-gray-500 mt-1">Configure your job search criteria to find the best matches</p>
            </div>

            {/* Target Roles */}
            <div>
              <Label className="text-base font-semibold">Target Roles *</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">The executive roles you're targeting</p>
              <SearchableMultiSelect
                items={[]}
                groupedBy={ROLES_DB}
                selected={jobSearchPrefs.target_roles}
                onSelect={(role) => setJobSearchPrefs(p => ({ ...p, target_roles: [...p.target_roles, role] }))}
                onRemove={(role) => setJobSearchPrefs(p => ({ ...p, target_roles: p.target_roles.filter(r => r !== role) }))}
                placeholder="Search roles (e.g., CFO, CTO, VP Finance)..."
              />
            </div>

            {/* Industries */}
            <div>
              <Label className="text-base font-semibold">Preferred Industries</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">Optional - leave blank for all industries</p>
              <SearchableMultiSelect
                items={INDUSTRIES_DB}
                selected={jobSearchPrefs.industries}
                onSelect={(ind) => setJobSearchPrefs(p => ({ ...p, industries: [...p.industries, ind] }))}
                onRemove={(ind) => setJobSearchPrefs(p => ({ ...p, industries: p.industries.filter(i => i !== ind) }))}
                placeholder="Search industries..."
              />
            </div>

            {/* Location */}
            <div>
              <Label className="text-base font-semibold">Location Preferences</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">Where you're willing to work</p>
              <SearchableMultiSelect
                items={US_CITIES}
                selected={jobSearchPrefs.preferred_locations}
                onSelect={(city) => setJobSearchPrefs(p => ({ ...p, preferred_locations: [...p.preferred_locations, city] }))}
                onRemove={(city) => setJobSearchPrefs(p => ({ ...p, preferred_locations: p.preferred_locations.filter(c => c !== city) }))}
                placeholder="Search cities..."
              />
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <Checkbox
                  checked={jobSearchPrefs.remote_preferences.includes("Fully Remote")}
                  onCheckedChange={(checked) => {
                    setJobSearchPrefs(p => ({
                      ...p,
                      remote_preferences: checked ? ["Fully Remote"] : []
                    }));
                  }}
                />
                <span className="text-sm">Open to Remote Work</span>
              </label>
            </div>

            {/* Salary Range */}
            <div>
              <Label className="text-base font-semibold">Target Salary Range</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">Your desired compensation range</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Minimum</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      value={jobSearchPrefs.min_salary}
                      onChange={e => setJobSearchPrefs(p => ({ ...p, min_salary: parseInt(e.target.value) || 0 }))}
                      className="pl-7 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Maximum</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      value={jobSearchPrefs.max_salary}
                      onChange={e => setJobSearchPrefs(p => ({ ...p, max_salary: parseInt(e.target.value) || 0 }))}
                      className="pl-7 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Company Size */}
            <div>
              <Label className="text-base font-semibold">Company Size (Employees)</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">Select all that apply</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Startup", sublabel: "1-50 employees", value: "1-50" },
                  { label: "Small", sublabel: "51-200 employees", value: "51-200" },
                  { label: "Mid-size", sublabel: "201-1000 employees", value: "201-1000" },
                  { label: "Enterprise", sublabel: "1000+ employees", value: "1000+" }
                ].map(size => (
                  <label key={size.value} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    jobSearchPrefs.company_sizes.includes(size.value) ? "border-[#F7931E] bg-[#FEF3E2]" : "border-gray-200 hover:bg-gray-50"
                  }`}>
                    <Checkbox
                      checked={jobSearchPrefs.company_sizes.includes(size.value)}
                      onCheckedChange={(checked) => {
                        setJobSearchPrefs(p => ({
                          ...p,
                          company_sizes: checked 
                            ? [...p.company_sizes, size.value]
                            : p.company_sizes.filter(s => s !== size.value)
                        }));
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
              <p className="text-xs text-gray-500 mt-1 mb-3">Optional - filter by fundraising stage</p>
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
                    jobSearchPrefs.funding_stages.includes(stage.value) ? "border-[#F7931E] bg-[#FEF3E2]" : "border-gray-200 hover:bg-gray-50"
                  }`}>
                    <Checkbox
                      checked={jobSearchPrefs.funding_stages.includes(stage.value)}
                      onCheckedChange={(checked) => {
                        setJobSearchPrefs(p => ({
                          ...p,
                          funding_stages: checked 
                            ? [...p.funding_stages, stage.value]
                            : p.funding_stages.filter(s => s !== stage.value)
                        }));
                      }}
                    />
                    <div>
                      <div className="text-sm font-medium">{stage.label}</div>
                      <div className="text-xs text-gray-500">{stage.sublabel}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Ideal Decision Maker */}
            <div>
              <Label className="text-base font-semibold">Ideal Decision Maker</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">Who would you ideally report to?</p>
              <RadioGroup value={jobSearchPrefs.ideal_decision_maker} onValueChange={v => setJobSearchPrefs(p => ({ ...p, ideal_decision_maker: v }))}>
                {["CEO / Founder", "Board of Directors", "CFO", "COO", "Other C-Suite Executive"].map(dm => (
                  <label key={dm} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <RadioGroupItem value={dm} />
                    <span className="text-sm">{dm}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Availability */}
            <div>
              <Label className="text-base font-semibold">Availability</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">When can you start a new role?</p>
              <RadioGroup value={jobSearchPrefs.availability} onValueChange={v => setJobSearchPrefs(p => ({ ...p, availability: v }))}>
                {["Immediately (within 1 week)", "2 weeks notice required", "4 weeks notice required", "6-8 weeks notice required", "Flexible timing"].map(av => (
                  <label key={av} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <RadioGroupItem value={av} />
                    <span className="text-sm">{av}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={() => saveJobSearchMutation.mutate()} 
                disabled={saveJobSearchMutation.isPending || !profile.id}
                className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2"
              >
                {saveJobSearchMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Preferences</>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 space-y-6 max-w-2xl">
            <h3 className="font-semibold text-gray-900">Application Settings</h3>

            <div className="space-y-4">
              <div>
                <Label>Daily Application Limit</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    value={[autoApplySettings.daily_limit]}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={([v]) => setAutoApplySettings(p => ({ ...p, daily_limit: v }))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-8 text-center">{autoApplySettings.daily_limit}</span>
                </div>
              </div>

              <div>
                <Label>Minimum Match Score Threshold</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    value={[autoApplySettings.match_threshold]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => setAutoApplySettings(p => ({ ...p, match_threshold: v }))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-8 text-center">{autoApplySettings.match_threshold}</span>
                </div>
              </div>

              <div>
                <Label>Email Signature</Label>
                <Textarea
                  value={autoApplySettings.email_signature}
                  onChange={e => setAutoApplySettings(p => ({ ...p, email_signature: e.target.value }))}
                  className="mt-1.5 rounded-xl"
                  placeholder="Your professional email signature..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 space-y-4 max-w-2xl">
            <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
            <p className="text-sm text-gray-500">
              Email notifications for applications, outreach responses, and new matching roles are enabled by default.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 space-y-6 max-w-2xl">
            <h3 className="font-semibold text-gray-900">Data & Privacy</h3>
            <p className="text-sm text-gray-500">
              Your data is encrypted and stored securely. You can export or delete your data at any time.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl">Export My Data (CSV)</Button>
            </div>
            <div className="pt-6 border-t border-gray-100">
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl gap-2"
                onClick={() => base44.auth.logout()}
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}