import React from "react";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

export default function EmailIntegrationBanner({ onConnect }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
          <AlertCircle className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">Email Integration Required</h3>
          <p className="text-sm text-gray-600 mb-4">
            Connect your email account to send outreach messages automatically. 
            Without email integration, messages will remain in "Draft" status and you'll need to copy/paste them manually.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={onConnect}
              className="bg-[#F7931E] hover:bg-[#E07A0A] text-white rounded-xl gap-2"
            >
              <Mail className="w-4 h-4" />
              Connect Gmail
            </Button>
            <Link to={createPageUrl("Settings")}>
              <Button variant="outline" className="rounded-xl">
                Go to Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}