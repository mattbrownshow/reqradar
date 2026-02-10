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
  User, Bell, Sliders, Shield, Save, Loader2, LogOut, Briefcase, Upload, FileText, ExternalLink, ChevronRight, Trash2, Sparkles, Play, Rss, Mail, Check
} from "lucide-react";
import SearchableMultiSelect from "../components/shared/SearchableMultiSelect";
import DiscoverySettings from "../components/settings/DiscoverySettings";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import ConnectedAccountsSection from "../components/settings/ConnectedAccountsSection";

export default function Settings() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const resumeInputRef = React.useRef(null);
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
    location_type: "remote_only",
    preferred_locations: []
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: async () => {
      const result = await base44.entities.CandidateProfile.list("-created_date", 1);
      return Array.isArray(result) ? result : [];
    },
    refetchOnMount: 'stale'
  });

  const profile = profiles[0] || {};

  React.useEffect(() => {
    if (profile.id) {
      setJobSearchPrefs({
        target_roles: profile.target_roles || [],
        location_type: profile.location_type || "remote_only",
        preferred_locations: profile.preferred_locations || []
      });
    }
  }, [profile?.id, profile?.target_roles, profile?.location_type, profile?.preferred_locations]);

  const saveJobSearchMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('No profile found');
      await base44.entities.CandidateProfile.update(profile.id, jobSearchPrefs);
      // Sync RSS feeds with updated target roles
      await base44.functions.invoke('syncRSSFeeds', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidateProfile"] });
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
    },
    onError: (error) => {
      console.error('Save failed:', error);
      alert('Failed to save preferences. Please try again.');
    }
  });

  const resetDataMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('resetUserData', {});
      // Clear all client-side caches
      localStorage.clear();
      sessionStorage.clear();
      queryClient.clear();
      return response;
    },
    onSuccess: () => {
      setShowResetConfirm(false);
      // Hard redirect to force page reload
      setTimeout(() => {
        window.location.href = createPageUrl("CandidateSetup");
      }, 500);
    },
    onError: (error) => {
      console.error('Reset failed:', error);
      alert('Failed to reset data. Please try again.');
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
      
      if (!profile?.id) {
        // Create profile if it doesn't exist
        const userEmail = user?.email || (await base44.auth.me()).email;
        await base44.entities.CandidateProfile.create({
          full_name: user?.full_name || '',
          email: userEmail,
          resume_url: file_url,
          resume_filename: file.name
        });
      } else {
        await base44.entities.CandidateProfile.update(profile.id, { 
          resume_url: file_url,
          resume_filename: file.name
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["candidateProfile"] });
    } catch (error) {
      console.error('Resume upload failed:', error);
      alert('Failed to upload resume. Please try again.');
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
            <TabsTrigger value="discovery" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              <Sparkles className="w-4 h-4" /> Discovery
            </TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              <Sliders className="w-4 h-4" /> Preferences
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              <Bell className="w-4 h-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="connected-accounts" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              <Mail className="w-4 h-4" /> Connected Accounts
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
                      <p className="text-sm font-semibold text-gray-900">{profile.resume_filename || 'Resume uploaded'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Last updated: {new Date(profile.updated_date || Date.now()).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={profile.resume_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                        View
                      </Button>
                    </a>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 rounded-xl" 
                      disabled={isUploadingResume}
                      onClick={() => resumeInputRef.current?.click()}
                    >
                      {isUploadingResume ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                      ) : (
                        <>Replace</>
                      )}
                    </Button>
                    <input 
                      ref={resumeInputRef}
                      type="file" 
                      accept=".pdf,.docx" 
                      className="hidden" 
                      onChange={handleResumeUpload} 
                    />
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
              <p className="text-sm text-gray-500 mt-1">We show you all jobs from RSS feeds matching your target roles and location preferences</p>
            </div>

            {/* Target Roles */}
            <div>
              <Label className="text-base font-semibold">Target Roles *</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">The job titles you're searching for</p>
              <SearchableMultiSelect
                items={[]}
                groupedBy={ROLES_DB}
                selected={jobSearchPrefs.target_roles}
                onSelect={(role) => setJobSearchPrefs(p => ({ ...p, target_roles: [...p.target_roles, role] }))}
                onRemove={(role) => setJobSearchPrefs(p => ({ ...p, target_roles: p.target_roles.filter(r => r !== role) }))}
                placeholder="Search roles (e.g., Chief Marketing Officer, VP Marketing)..."
              />
            </div>

            {/* Location Preferences */}
            <div>
              <Label className="text-base font-semibold">Location Preferences *</Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">Choose your work location preference</p>
              <RadioGroup value={jobSearchPrefs.location_type} onValueChange={v => setJobSearchPrefs(p => ({ ...p, location_type: v }))}>
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="remote_only" />
                  <div>
                    <p className="font-medium text-gray-900">Remote Only</p>
                    <p className="text-xs text-gray-500 mt-0.5">Only show remote positions</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="specific_locations" />
                  <div>
                    <p className="font-medium text-gray-900">Specific Locations</p>
                    <p className="text-xs text-gray-500 mt-0.5">Jobs in certain cities/states</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="both" />
                  <div>
                    <p className="font-medium text-gray-900">Both Remote and On-site</p>
                    <p className="text-xs text-gray-500 mt-0.5">Show all opportunities</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Specific Locations (conditional) */}
            {(jobSearchPrefs.location_type === "specific_locations" || jobSearchPrefs.location_type === "both") && (
              <div>
                <Label className="text-base font-semibold">Specific Locations</Label>
                <p className="text-xs text-gray-500 mt-1 mb-3">Enter cities/states you're interested in</p>
                <SearchableMultiSelect
                  items={US_CITIES}
                  selected={jobSearchPrefs.preferred_locations}
                  onSelect={(city) => setJobSearchPrefs(p => ({ ...p, preferred_locations: [...p.preferred_locations, city] }))}
                  onRemove={(city) => setJobSearchPrefs(p => ({ ...p, preferred_locations: p.preferred_locations.filter(c => c !== city) }))}
                  placeholder="Search cities..."
                />
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={() => saveJobSearchMutation.mutate()} 
                disabled={saveJobSearchMutation.isPending || profilesLoading || !profile?.id}
                className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2"
              >
                {saveJobSearchMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : saveJobSearchMutation.isSuccess ? (
                  <><Check className="w-4 h-4" /> Saved</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Preferences</>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="discovery" className="mt-6">
          <DiscoverySettings />
        </TabsContent>

        <TabsContent value="connected-accounts" className="mt-6">
          <ConnectedAccountsSection user={user} />
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
            
            {/* Reset Data Section */}
            <div className="pt-6 border-t border-gray-100 space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Reset All Data</h4>
                <p className="text-xs text-gray-500 mb-3">This will only clear all the data you've created within the application, such as your candidate profile, saved companies, job opportunities, applications, and activity logs. Your account itself will remain, but all your personalized data will be removed.</p>
              </div>
              {!showResetConfirm ? (
                <Button
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700 rounded-xl gap-2"
                  onClick={() => setShowResetConfirm(true)}
                >
                  <Trash2 className="w-4 h-4" /> Reset All Data
                </Button>
              ) : (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                  <p className="text-sm font-medium text-gray-900">Are you sure? This cannot be undone.</p>
                  <p className="text-xs text-gray-600">You'll be taken through setup again to configure your profile.</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg gap-2"
                      onClick={() => resetDataMutation.mutate()}
                      disabled={resetDataMutation.isPending}
                    >
                      {resetDataMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                      Yes, Reset Everything
                    </Button>
                  </div>
                </div>
              )}
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