import React from 'react';
import { Building2, Users, MapPin, Calendar, TrendingUp, DollarSign, Briefcase } from 'lucide-react';

function RoleCard({ role }) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl hover:shadow-lg hover:border-orange-200 transition-all overflow-hidden">
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg mb-1">{role.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4" />
              <span>{role.company_name}</span>
            </div>
          </div>
          {role.match_score && (
            <div className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-bold shrink-0">
              {Math.round(role.match_score)}%
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
          {role.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {role.location}
            </span>
          )}
          {(role.salary_min || role.salary_max) && (
            <span className="flex items-center gap-1.5 font-medium">
              <DollarSign className="w-4 h-4" />
              ${(role.salary_min / 1000).toFixed(0)}K - ${(role.salary_max / 1000).toFixed(0)}K
            </span>
          )}
          {role.work_type && (
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              {role.work_type}
            </span>
          )}
        </div>

        <div className="pt-3 border-t border-gray-100 space-y-3">
          {role.description && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">DESCRIPTION</p>
              <p className="text-sm text-gray-700">{role.description}</p>
            </div>
          )}
          
          {role.requirements && role.requirements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">REQUIREMENTS</p>
              <ul className="space-y-1">
                {role.requirements.map((req, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {role.match_reasons && role.match_reasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">WHY THIS MATCHES</p>
              <ul className="space-y-1">
                {role.match_reasons.map((reason, idx) => (
                  <li key={idx} className="text-sm text-emerald-700 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {role.source && (
              <span className="text-xs text-gray-500">Source: {role.source}</span>
            )}
            {role.posted_date && (
              <span className="text-xs text-gray-500">Posted: {new Date(role.posted_date).toLocaleDateString()}</span>
            )}
          </div>

          {role.source_url && (
            <a 
              href={role.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full text-center py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              View Job →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OverviewTab({ company, roles }) {
  return (
    <div className="space-y-6">
      {/* Active Roles Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Opportunities ({roles.length})</h2>
        
        {roles.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-600">No active roles saved for this company</p>
          </div>
        ) : (
          <div className="space-y-4">
            {roles.map(role => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        )}
      </div>

      {/* Company Snapshot */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Snapshot</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Building2, label: 'Industry', value: company.industry || 'Unknown' },
            { icon: Users, label: 'Size', value: company.employee_count ? `${company.employee_count.toLocaleString()} employees` : 'Unknown' },
            { icon: MapPin, label: 'Location', value: company.location || 'Unknown' },
            { icon: Calendar, label: 'Founded', value: company.founded_year || 'Unknown' }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <Icon className="w-5 h-5 text-orange-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600 font-semibold mb-1">{stat.label}</p>
                <p className="text-sm font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Company Intelligence Highlights */}
      {(company.intelligence_signals?.length > 0 || company.hiring_signals?.length > 0) && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Intelligence Signals</h2>
          
          <div className="space-y-2">
            {company.intelligence_signals?.map((signal, i) => (
              <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-3">
                <TrendingUp className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                <p className="text-sm text-orange-900">{signal}</p>
              </div>
            ))}
            {company.hiring_signals?.map((signal, i) => (
              <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
                <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-900">{signal}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}