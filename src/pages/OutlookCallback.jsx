import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function OutlookCallback() {
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get('code');
      const userId = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        throw new Error(`Authorization denied: ${error}`);
      }

      if (!authCode || !userId) {
        throw new Error('No authorization code or user ID received');
      }

      console.log('Exchanging Outlook auth code...');

      const result = await base44.functions.invoke('exchangeOutlookAuthCode', {
        auth_code: authCode,
        user_id: parseInt(userId)
      });

      if (result.data.success) {
        console.log('Outlook connected:', result.data.email);
        setStatus('success');
        setTimeout(() => {
          window.location.href = '/settings';
        }, 2000);
      } else {
        throw new Error(result.data.error || 'Connection failed');
      }
    } catch (error) {
      console.error('Outlook OAuth error:', error);
      setStatus('error');
      setErrorMessage(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md w-full text-center">
        {status === 'processing' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-orange-500 rounded-full animate-spin"></div>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Connecting Outlook...</h2>
              <p className="text-gray-600 mt-2">Please wait while we complete the authorization</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Outlook Connected!</h2>
              <p className="text-gray-600 mt-2">Your Outlook account has been successfully connected</p>
              <p className="text-sm text-gray-500 mt-4 italic">Redirecting to settings...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Connection Failed</h2>
              <p className="text-red-600 font-medium mt-3">{errorMessage}</p>
              <button
                onClick={() => window.location.href = '/settings'}
                className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Return to Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}