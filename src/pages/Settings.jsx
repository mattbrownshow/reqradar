import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, Bell, Sliders, Shield, Save, Loader2, LogOut
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function Settings() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [autoApplySettings, setAutoApplySettings] = useState({
    daily_limit: 10,
    match_threshold: 70,
    email_signature: ""
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: profiles = [] } = useQuery({
    queryKey: ["candidateProfile"],
    queryFn: () => base44.entities.CandidateProfile.list("-created_date", 1),
  });

  const profile = profiles[0] || {};

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            <User className="w-4 h-4" /> Profile
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

        <TabsContent value="profile" className="mt-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 space-y-6 max-w-2xl">
            <h3 className="font-semibold text-gray-900">Account Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">Name</Label>
                <p className="font-medium mt-1">{user?.full_name || profile.full_name || "—"}</p>
              </div>
              <div>
                <Label className="text-gray-500">Email</Label>
                <p className="font-medium mt-1">{user?.email || profile.email || "—"}</p>
              </div>
              <div>
                <Label className="text-gray-500">Phone</Label>
                <p className="font-medium mt-1">{profile.phone || "—"}</p>
              </div>
              <div>
                <Label className="text-gray-500">Current Title</Label>
                <p className="font-medium mt-1">{profile.current_title || "—"}</p>
              </div>
            </div>
            <Link to={createPageUrl("CandidateSetup")}>
              <Button variant="outline" className="rounded-xl gap-2 mt-2">
                Edit Full Profile
              </Button>
            </Link>
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
  );
}