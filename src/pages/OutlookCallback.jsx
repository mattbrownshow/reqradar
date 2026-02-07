import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function OutlookCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (!code) {
        setStatus('error');
        setError('Authorization canceled. No code received.');
        return;
      }

      // Exchange code for token
      const response = await base44.functions.invoke('exchangeOutlookAuthCode', { code });

      if (response.data.success) {
        setStatus('success');
        setTimeout(() => {
          navigate(createPageUrl('Settings') + '?tab=connected-accounts');
        }, 2000);
      } else {
        setStatus('error');
        setError(response.data.error || 'Failed to connect Outlook');
      }
    } catch (err) {
      console.error('Error:', err);
      setStatus('error');
      setError(err.message || 'An error occurred during Outlook connection');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connecting Outlook...</h2>
            <p className="text-gray-600">Please wait while we authorize your account</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Outlook Connected!</h2>
            <p className="text-gray-600 mb-4">Your Outlook account is now connected.</p>
            <p className="text-sm text-gray-500">Redirecting to Settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate(createPageUrl('Settings') + '?tab=connected-accounts')}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}