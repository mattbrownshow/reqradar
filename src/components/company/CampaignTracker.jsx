import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function CampaignTracker({ companyId, companyName }) {
  const { data: outreachMessages = [] } = useQuery({
    queryKey: ['outreachMessages', companyId],
    queryFn: () => base44.entities.OutreachMessage.filter({ company_id: companyId }),
    enabled: !!companyId
  });

  if (outreachMessages.length === 0) {
    return null;
  }

  const stats = {
    sent: outreachMessages.filter(m => m.status === 'sent').length,
    delivered: outreachMessages.filter(m => m.status === 'delivered').length,
    opened: outreachMessages.filter(m => m.status === 'opened').length,
    responded: outreachMessages.filter(m => m.status === 'responded').length,
    bounced: outreachMessages.filter(m => m.status === 'bounced').length
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'delivered':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'opened':
        return <Mail className="w-4 h-4 text-orange-500" />;
      case 'responded':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'bounced':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-gray-100 text-gray-800';
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      case 'opened':
        return 'bg-orange-100 text-orange-800';
      case 'responded':
        return 'bg-green-100 text-green-800';
      case 'bounced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Campaign Performance</h3>
        <span className="text-sm text-gray-500">{outreachMessages.length} messages</span>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.sent}</div>
          <div className="text-xs text-gray-600">Sent</div>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-900">{stats.delivered}</div>
          <div className="text-xs text-blue-600">Delivered</div>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-900">{stats.opened}</div>
          <div className="text-xs text-orange-600">Opened</div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-900">{stats.responded}</div>
          <div className="text-xs text-green-600">Responded</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-900">{stats.bounced}</div>
          <div className="text-xs text-red-600">Bounced</div>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {outreachMessages.slice(0, 10).map(msg => (
          <div key={msg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex items-center gap-3 flex-1">
              {getStatusIcon(msg.status)}
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{msg.contact_name}</p>
                <p className="text-xs text-gray-500 truncate">{msg.subject}</p>
              </div>
            </div>
            <Badge className={getStatusBadgeClass(msg.status)}>
              {msg.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}