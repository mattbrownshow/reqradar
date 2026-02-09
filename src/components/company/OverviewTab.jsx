import React from 'react';
import { Building2, Users, MapPin, Calendar, TrendingUp, DollarSign, Briefcase } from 'lucide-react';

function RoleCard({ role }) {
  const [expanded, setExpanded] = React.useState(false);
  
  const daysAgo = role.posted_date 
    ? Math.floor((new Date() - new Date(role.posted_date)) / (1000 * 60 * 60 * 24))
    : null;

  const truncatedDescription = role.description && role.description.length > 300
    ? role.description.substring(0, 300) + '...'
    : role.description;

  const stageBadgeStyle = {
    'saved': 'bg-blue-600 text-white',
    'researching': 'bg-blue-600 text-white',
    'intel_gathering': 'bg-purple-600 text-white',
    'outreach_active': 'bg-orange-600 text-white',
    'interviewing': 'bg-green-600 text-white'
  };

  const stageLabel = {
    'saved': 'Saved',
    'researching': 'Researching',
    'intel_gathering': 'Intel Gathering',
    'outreach_active': 'Outreach Active',
    'interviewing': 'Interviewing'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all p-6">
      <div className="space-y-4">
        {/* Title */}
        <h3 className="font-bold text-gray-900 text-xl">{role.title}</h3>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
          {role.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {role.location}
            </span>
          )}
          {role.work_type && <span>• {role.work_type}</span>}
          {daysAgo !== null && <span>• Posted {daysAgo} days ago</span>}
        </div>

        {/* Description */}
        {role.description && (
          <div>
            <p className="text-gray-700 leading-relaxed">
              {expanded ? role.description : truncatedDescription}
            </p>
            {role.description.length > 300 && (
              <button 
                onClick={() => setExpanded(!expanded)}
                className="text-orange-600 hover:text-orange-700 text-sm font-medium mt-1"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* Requirements */}
        {role.requirements && role.requirements.length > 0 && (
          <div>
            <p className="font-semibold text-gray-900 mb-2">Requirements:</p>
            <ul className="space-y-1">
              {role.requirements.slice(0, 3).map((req, idx) => (
                <li key={idx} className="text-gray-700 flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
            {role.requirements.length > 3 && (
              <p className="text-sm text-gray-500 mt-2">+ {role.requirements.length - 3} more</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          {role.source_url && (
            <a 
              href={role.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 text-center py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
            >
              View Job →
            </a>
          )}
          {role.pipeline_stage && (
            <div className={`px-3 py-2 rounded-full text-sm font-semibold ${stageBadgeStyle[role.pipeline_stage] || 'bg-gray-600 text-white'}`}>
              Pipeline: {stageLabel[role.pipeline_stage] || role.pipeline_stage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OverviewTab({ company, roles }) {
  return (
    <div className="space-y-6">
      {/* Active Opportunities Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Opportunities ({roles.length})</h2>
        
        {roles.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-600 mb-2">No active roles saved for this company</p>
            <p className="text-sm text-gray-500">Jobs you save to your pipeline will appear here</p>
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