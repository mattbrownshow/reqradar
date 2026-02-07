import React from 'react';
import { Building2, MapPin, Users, Globe, ExternalLink, Loader2 } from 'lucide-react';

export default function CompanyHeader({ company, enriching }) {
  if (!company) return null;

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[80px] z-40">
      <div className="px-6 py-6 max-w-7xl mx-auto flex items-start gap-6 w-full">
        {/* Logo */}
        <div className="w-20 h-20 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl flex items-center justify-center shrink-0 text-3xl font-bold text-orange-600">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover rounded-2xl" />
          ) : (
            company.name[0]
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
              <p className="text-gray-600 mt-1">{company.description?.substring(0, 150)}</p>
            </div>
            {enriching && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enriching...</span>
              </div>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
            {company.industry && (
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {company.industry}
              </span>
            )}
            {company.employee_count && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {company.employee_count.toLocaleString()} employees
              </span>
            )}
            {company.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {company.location}
              </span>
            )}
            {company.domain && (
              <a 
                href={`https://${company.domain}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-orange-600 hover:underline"
              >
                <Globe className="w-4 h-4" />
                {company.domain}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}