import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

export default function ConnectedAccountsSection({ user }) {
  const [emailStatus, setEmailStatus] = useState({
    provider: null,
    connected: false,
    email: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConnectionStatus();
  }, []);

  async function loadConnectionStatus() {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.email_provider) {
        setEmailStatus({
          provider: currentUser.email_provider,
          connected: currentUser.email_connected || false,
          email: currentUser.email_address
        });
      }
    } catch (error) {
      console.error('Failed to load connection status:', error);
    }
  }

  async function connectGmail() {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      const response = await base44.functions.invoke('getGoogleOAuthUrl', {
        user_id: currentUser.id
      });
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Failed to initiate Gmail connection:', error);
      alert('Failed to connect Gmail. Please try again.');
      setLoading(false);
    }
  }

  async function connectOutlook() {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      const response = await base44.functions.invoke('getMicrosoftOAuthUrl', {
        user_id: currentUser.id
      });
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Failed to initiate Outlook connection:', error);
      alert('Failed to connect Outlook. Please try again.');
      setLoading(false);
    }
  }

  async function disconnectEmail() {
    if (!confirm('Disconnect your email account? You will not be able to send outreach until you reconnect.')) {
      return;
    }

    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      await base44.auth.updateMe({
        email_provider: null,
        email_connected: false,
        email_address: null,
        gmail_access_token: null,
        gmail_refresh_token: null,
        gmail_token_expires: null,
        outlook_access_token: null,
        outlook_refresh_token: null,
        outlook_token_expires: null
      });

      setEmailStatus({
        provider: null,
        connected: false,
        email: null
      });

      alert('Email account disconnected successfully');
    } catch (error) {
      console.error('Disconnect failed:', error);
      alert('Failed to disconnect: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Email Accounts */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Email Accounts</h3>
        <p className="text-sm text-gray-500 mb-4">
          Connect your email to send personalized outreach to decision makers
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gmail Card */}
          <div className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M4 6l8 6 8-6" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Gmail</h4>
                <p className="text-sm text-gray-500">Send via your Gmail account</p>
              </div>
            </div>

            {emailStatus.connected && emailStatus.provider === 'gmail' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected
                </div>
                <p className="text-sm text-gray-600">{emailStatus.email}</p>
                <button
                  onClick={disconnectEmail}
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
                >
                  {loading ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  <Circle className="w-4 h-4" />
                  Not Connected
                </div>
                <button
                  onClick={connectGmail}
                  disabled={loading || (emailStatus.connected && emailStatus.provider === 'outlook')}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors font-medium"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </span>
                  ) : (
                    'Connect Gmail'
                  )}
                </button>
                {emailStatus.connected && emailStatus.provider === 'outlook' && (
                  <p className="text-xs text-gray-500 italic">Disconnect Outlook first to switch providers</p>
                )}
              </div>
            )}
          </div>

          {/* Outlook Card */}
          <div className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="4" width="16" height="16" rx="2" fill="#0078D4" opacity="0.1" stroke="#0078D4" strokeWidth="1.5"/>
                  <path d="M9 10h6v6H9z" fill="#0078D4"/>
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Microsoft Outlook</h4>
                <p className="text-sm text-gray-500">Send via your Outlook account</p>
              </div>
            </div>

            {emailStatus.connected && emailStatus.provider === 'outlook' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected
                </div>
                <p className="text-sm text-gray-600">{emailStatus.email}</p>
                <button
                  onClick={disconnectEmail}
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
                >
                  {loading ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  <Circle className="w-4 h-4" />
                  Not Connected
                </div>
                <button
                  onClick={connectOutlook}
                  disabled={loading || (emailStatus.connected && emailStatus.provider === 'gmail')}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors font-medium"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </span>
                  ) : (
                    'Connect Outlook'
                  )}
                </button>
                {emailStatus.connected && emailStatus.provider === 'gmail' && (
                  <p className="text-xs text-gray-500 italic">Disconnect Gmail first to switch providers</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LinkedIn */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">LinkedIn</h3>
        <p className="text-sm text-gray-500 mb-4">
          Connect LinkedIn to send connection requests and messages (Coming Soon)
        </p>

        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="2" fill="#0A66C2" opacity="0.1" stroke="#0A66C2" strokeWidth="1.5"/>
                <circle cx="9" cy="8" r="1.5" fill="#0A66C2"/>
                <path d="M7 10h4v8H7z" stroke="#0A66C2" strokeWidth="1.5"/>
                <path d="M13 10h4v5c0 1.5-.5 3-1.5 3" stroke="#0A66C2" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">LinkedIn</h4>
              <p className="text-sm text-gray-500">Send connection requests and messages</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <Circle className="w-4 h-4" />
              Not Connected
            </div>
            <button
              disabled={true}
              className="w-full px-4 py-2 border border-gray-200 text-gray-400 rounded-lg bg-gray-50 cursor-not-allowed transition-colors font-medium"
            >
              Coming Soon
            </button>
            <p className="text-xs text-gray-500 italic">LinkedIn integration launching in Phase 2</p>
          </div>
        </div>
      </div>
    </div>
  );
}