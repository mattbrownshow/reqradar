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

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-100">
        <Button
          onClick={() => window.location.href = `/companyDetail?id=${contact.company_id}`}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          View Company Intelligence
        </Button>
      </div>
    </div>
  );
}