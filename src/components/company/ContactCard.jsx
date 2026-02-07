import React, { useState } from 'react';
import { Mail, Phone, Linkedin, Copy, Send, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ContactCard({ contact, generatedMessage, onGenerateMessage, onManualApply }) {
  const [editMode, setEditMode] = useState(false);
  const [editedMessage, setEditedMessage] = useState(generatedMessage);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [activeMessageTab, setActiveMessageTab] = useState('email');

  const handleSaveEdit = () => {
    // Callback to parent to save edited message
    setEditMode(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
      {/* Contact Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-lg font-bold text-gray-600 shrink-0">
            {contact.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{contact.full_name}</h3>
                <p className="text-sm text-gray-600">{contact.title}</p>
                <p className="text-xs text-gray-500">{contact.seniority} • {contact.department}</p>
              </div>
              {contact.relevance_score && (
                <div className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-sm font-semibold">
                  {contact.relevance_score}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="px-6 py-4 space-y-3 border-b border-gray-100 bg-gray-50">
        {contact.email && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-gray-900">{contact.email}</span>
              {contact.email_verified && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ Verified</span>}
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => copyToClipboard(contact.email)}
              className="h-7 w-7 p-0"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        )}

        {contact.phone && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-500" />
              <a href={`tel:${contact.phone}`} className="text-gray-900 hover:underline">{contact.phone}</a>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => copyToClipboard(contact.phone)}
              className="h-7 w-7 p-0"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        )}

        {contact.linkedin_url && (
          <div className="flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-gray-500" />
            <a 
              href={contact.linkedin_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View LinkedIn Profile →
            </a>
          </div>
        )}
      </div>

      {/* Outreach Message */}
      {generatedMessage && !generatedMessage.error && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Personalized Outreach</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditMode(!editMode)}
              className="gap-1"
            >
              {editMode ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </Button>
          </div>

          {/* Message Tabs */}
          <div className="flex gap-2 border-b border-gray-100">
            {[
              { key: 'email', label: 'Email' },
              { key: 'linkedin_connection', label: 'LinkedIn Connection' },
              { key: 'linkedin_message_1', label: 'LinkedIn Message 1' },
              { key: 'linkedin_message_2', label: 'LinkedIn Follow-up' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveMessageTab(tab.key)}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeMessageTab === tab.key
                    ? 'text-orange-600 border-orange-600'
                    : 'text-gray-600 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Message Content */}
          {editMode ? (
            <div className="space-y-3">
              {activeMessageTab === 'email' && (
                <>
                  <input
                    type="text"
                    value={editedMessage.email_subject || ''}
                    onChange={(e) => setEditedMessage({ ...editedMessage, email_subject: e.target.value })}
                    placeholder="Subject line"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <textarea
                    value={editedMessage.email_body || ''}
                    onChange={(e) => setEditedMessage({ ...editedMessage, email_body: e.target.value })}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                  />
                </>
              )}
              {activeMessageTab !== 'email' && (
                <textarea
                  value={editedMessage[activeMessageTab] || ''}
                  onChange={(e) => setEditedMessage({ ...editedMessage, [activeMessageTab]: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  className="bg-orange-600 hover:bg-orange-700 text-white gap-1"
                >
                  <Check className="w-4 h-4" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              {activeMessageTab === 'email' && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">SUBJECT:</p>
                    <p className="text-sm text-gray-900">{editedMessage.email_subject}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">MESSAGE:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {showFullMessage ? editedMessage.email_body : editedMessage.email_body?.substring(0, 300) + '...'}
                    </p>
                    {editedMessage.email_body?.length > 300 && (
                      <button
                        onClick={() => setShowFullMessage(!showFullMessage)}
                        className="text-sm text-orange-600 hover:underline mt-2"
                      >
                        {showFullMessage ? 'Show Less' : 'Show Full Message'}
                      </button>
                    )}
                  </div>
                </>
              )}
              {activeMessageTab !== 'email' && (
                <div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {editedMessage[activeMessageTab]}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Send Actions */}
          {!editMode && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-2"
                onClick={() => onManualApply(contact, editedMessage)}
              >
                <Send className="w-4 h-4" />
                Send This Message
              </Button>
            </div>
          )}
        </div>
      )}

      {/* No Message State */}
      {!generatedMessage && (
        <div className="p-6 text-center">
          <Button
            onClick={() => onGenerateMessage(contact)}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Generate Outreach Message
          </Button>
        </div>
      )}
    </div>
  );
}