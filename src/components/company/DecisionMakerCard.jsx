import React, { useState } from 'react';
import { Linkedin, Mail, Phone, Unlock, Eye, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function DecisionMakerCard({ contact, onRevealContact, revealing }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const hasContactInfo = contact.email || contact.phone;
  const initials = contact.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || '??';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
      <div className="flex items-start gap-4 mb-4">
        {/* Profile Photo or Initials */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-700 font-bold text-lg shrink-0">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-lg truncate">
            {contact.full_name}
          </h3>
          <p className="text-sm text-gray-600 truncate">{contact.title}</p>
          <p className="text-xs text-gray-500 mt-1">{contact.company_name}</p>
          
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
            >
              <Linkedin className="w-3 h-3" />
              LinkedIn Profile
            </a>
          )}
        </div>
      </div>

      {/* Contact Info (if revealed) */}
      {hasContactInfo && expanded && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Mail className="w-4 h-4 text-gray-400" />
              <a href={`mailto:${contact.email}`} className="hover:text-orange-600">
                {contact.email}
              </a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Phone className="w-4 h-4 text-gray-400" />
              <a href={`tel:${contact.phone}`} className="hover:text-orange-600">
                {contact.phone}
              </a>
            </div>
          )}
          {contact.data_sources && contact.data_sources.length > 0 && (
            <p className="text-xs text-gray-500">
              Source: {contact.data_sources.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!hasContactInfo ? (
          <Button
            variant="outline"
            className="flex-1 border-orange-600 text-orange-600 hover:bg-orange-50 gap-2"
            onClick={() => onRevealContact(contact)}
            disabled={revealing}
          >
            <Unlock className="w-4 h-4" />
            {revealing ? 'Revealing...' : 'Get Contact Info'}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => setExpanded(!expanded)}
          >
            <Eye className="w-4 h-4" />
            {expanded ? 'Hide' : 'View'} Contact Info
          </Button>
        )}
        
        <Button
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-2"
          onClick={() => navigate(createPageUrl('OutreachInbox') + `?contactId=${contact.id}&companyId=${contact.company_id}`)}
        >
          <Send className="w-4 h-4" />
          Draft Outreach
        </Button>
      </div>
    </div>
  );
}