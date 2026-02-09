import React from 'react';
import { Building2, Users, MapPin, Calendar, TrendingUp } from 'lucide-react';

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map(role => (
              <div key={role.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{role.title}</h3>
                    <p className="text-sm text-gray-600">{role.location || 'Unknown location'}</p>
                  </div>
                  {role.match_score && (
                    <div className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-sm font-bold">
                      {Math.round(role.match_score)}%
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {(role.salary_min || role.salary_max) && (
                    <p className="flex items-center gap-2">
                      💰 ${(role.salary_min / 1000).toFixed(0)}K - ${(role.salary_max / 1000).toFixed(0)}K
                    </p>
                  )}
                  {role.work_type && <p>• {role.work_type}</p>}
                  {role.source && <p>• Posted on {role.source}</p>}
                </div>

                {role.description && (
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3">{role.description}</p>
                )}
                
                {role.source_url && (
                  <a 
                    href={role.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-blue-600 hover:underline"
                  >
                    View on {role.source || 'job board'} →
                  </a>
                )}
              </div>
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