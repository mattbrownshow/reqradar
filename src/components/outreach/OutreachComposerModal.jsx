import React, { useState, useEffect } from 'react';
import { X, Copy, RefreshCw, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function OutreachComposerModal({ company, contacts, roles, user, onClose }) {
  const [selectedContactId, setSelectedContactId] = useState(contacts[0]?.id || '');
  const [messageType, setMessageType] = useState('email');
  const [tone, setTone] = useState('executive_peer');
  const [generatedMessage, setGeneratedMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailConnected, setEmailConnected] = useState(false);
  const [subjectLine, setSubjectLine] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  useEffect(() => {
    base44.auth.me().then(currentUser => {
      setEmailConnected(currentUser?.email_connected || false);
    }).catch(() => {});
  }, []);

  const generateSubjectLine = () => {
    const firstRole = roles[0];
    if (!firstRole) return 'Connection - Shared Interest in Growth';
    return `${firstRole.title} Opportunity at ${company.name}`;
  };

  useEffect(() => {
    if (messageType === 'email' && !subjectLine) {
      setSubjectLine(generateSubjectLine());
    }
  }, [messageType, messageType === 'email']);

  const handleSendEmail = async () => {
    if (!selectedContact || !generatedMessage) return;

    setSending(true);
    try {
      const response = await base44.functions.invoke('sendOutreachEmail', {
        decision_maker_id: selectedContact.id,
        company_id: company.id,
        contact_name: selectedContact.full_name,
        contact_email: selectedContact.email,
        subject: subjectLine,
        body: generatedMessage.message,
        message_type: messageType,
        tone: tone
      });

      if (response.data.success) {
        alert('Email sent successfully!');
        setShowConfirmation(false);
        onClose();
      } else {
        alert('Failed to send email: ' + response.data.error);
      }
    } catch (error) {
      console.error('Send failed:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!selectedContact) return;

    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateOutreachMessage', {
        company_name: company.name,
        company_industry: company.industry,
        company_description: company.description,
        company_signals: company.intelligence_signals || [],
        contact_name: selectedContact.full_name,
        contact_title: selectedContact.title,
        contact_seniority: selectedContact.seniority,
        message_type: messageType,
        tone: tone,
        active_role: roles[0] ? {
          title: roles[0].title,
          description: roles[0].description,
          location: roles[0].location,
          salary_min: roles[0].salary_min,
          salary_max: roles[0].salary_max
        } : null,
        user_background: user?.full_name || 'Experienced Professional'
      });

      setGeneratedMessage(response.data);
    } catch (error) {
      console.error('Failed to generate message:', error);
      alert('Failed to generate message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    const text = generatedMessage?.message || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const charLimit = messageType === 'linkedin_connection' ? 300 : messageType === 'linkedin_inmail' ? 2000 : null;
  const messageLength = generatedMessage?.message?.length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Craft Personalized Outreach</h2>
            <p className="text-sm text-gray-600 mt-1">{company.name} • {contacts.length} Decision Makers</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            
            {/* Left: Intelligence Context */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                <h3 className="font-semibold text-gray-900 text-sm">Intelligence Context</h3>
                
                {/* Active Opportunities */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">✓ ACTIVE OPPORTUNITIES</p>
                  {roles.length > 0 ? (
                    <ul className="text-xs text-gray-700 space-y-1">
                      {roles.slice(0, 3).map(role => (
                        <li key={role.id}>• {role.title}</li>
                      ))}
                      {roles.length > 3 && <li className="text-gray-500">+{roles.length - 3} more</li>}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500">No open roles</p>
                  )}
                </div>

                {/* Decision Makers */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">✓ DECISION MAKERS</p>
                  <p className="text-xs text-gray-700">{contacts.length} contacts identified</p>
                </div>

                {/* Company Signals */}
                {company.intelligence_signals && company.intelligence_signals.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">✓ COMPANY SIGNALS</p>
                    <ul className="text-xs text-gray-700 space-y-1">
                      {company.intelligence_signals.slice(0, 3).map((signal, i) => (
                        <li key={i}>• {signal}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Company Info */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">✓ COMPANY INFO</p>
                  <p className="text-xs text-gray-700">
                    {company.industry && `${company.industry} • `}
                    {company.employee_count && `${company.employee_count} employees`}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Message Generator */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Recipient Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Recipient</label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.full_name} • {contact.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Message Type</label>
                <div className="space-y-2">
                  {[
                    { value: 'linkedin_connection', label: 'LinkedIn Connection Request (300 char)' },
                    { value: 'linkedin_inmail', label: 'LinkedIn InMail (2000 char)' },
                    { value: 'email', label: 'Email (no limit)' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="message_type"
                        value={option.value}
                        checked={messageType === option.value}
                        onChange={(e) => setMessageType(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Tone</label>
                <div className="space-y-2">
                  {[
                    { value: 'executive_peer', label: 'Executive Peer (confident, strategic)' },
                    { value: 'problem_solver', label: 'Problem Solver (capability-focused)' },
                    { value: 'warm_intro', label: 'Warm Introduction (connection angle)' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tone"
                        value={option.value}
                        checked={tone === option.value}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateMessage}
                disabled={loading || !selectedContact}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  'Generate Personalized Message'
                )}
              </Button>

              {/* Generated Message */}
              {generatedMessage && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Generated Message</p>
                    {charLimit && (
                      <span className={`text-xs font-medium ${messageLength > charLimit ? 'text-red-600' : 'text-gray-600'}`}>
                        {messageLength} / {charLimit}
                      </span>
                    )}
                  </div>

                  <textarea
                    value={generatedMessage.message}
                    readOnly
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  />

                  <p className="text-xs text-gray-600 italic">
                    AI used: Company signals, active role, your background
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateMessage}
                      disabled={loading}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </Button>
                    <Button
                      onClick={handleCopyToClipboard}
                      variant="outline"
                      className="flex-1 gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex gap-3 justify-end bg-gray-50">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}