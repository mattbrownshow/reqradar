import React, { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";

const descriptions = {
  suggestions: {
    icon: '⭐',
    title: 'Daily Recommendations',
    text: 'The system found these companies matching your profile overnight. Review them and add the interesting ones to your Target List.',
    tip: 'Companies with job counts show matching VP of Operations roles found on their career pages.'
  },
  companies: {
    icon: '🏢',
    title: 'Discover & Track Companies',
    text: 'Search for companies matching your ideal employer profile. When you add a company to your Target List, the system automatically scans their career page for VP of Operations roles, finds decision maker contacts, and monitors for new postings daily.',
    tip: 'Companies showing job counts have matching roles available right now.'
  },
  openRoles: {
    icon: '💼',
    title: 'All Your Job Opportunities',
    text: 'Every VP of Operations role available to you, from all sources: Target Companies (jobs at companies you\'re tracking), Job Boards (Indeed/LinkedIn RSS feeds), and Suggestions (daily discoveries).',
    tip: 'Use the tabs to filter by source, or view all opportunities at once.'
  },
  jobBoards: {
    icon: '📰',
    title: 'Manage Job Feeds',
    text: 'Set up automated job alerts from Indeed, LinkedIn, and other sources. Jobs from these feeds appear in Open Roles after filtering by your preferences.',
    tip: 'The system automatically filters feeds to show only VP of Operations roles.'
  },
  pipeline: {
    icon: '🎯',
    title: 'Track Your Applications',
    text: 'Manage jobs through your search process: Saved → Researching → Applied → Interviewing → Offer. Drag jobs between stages to track your progress.',
    tip: 'Add notes and interview dates to stay organized.'
  },
  outreach: {
    icon: '✉️',
    title: 'Contact Decision Makers',
    text: 'Generate personalized messages to CEOs, CFOs, and hiring managers at your target companies using AI.',
    tip: 'The system finds verified contact info from multiple sources.'
  },
  analytics: {
    icon: '📊',
    title: 'Track Your Progress',
    text: 'See your job search metrics: applications sent vs. responses received, interview conversion rates, companies by stage, and time to offer.',
    tip: 'Use insights to optimize your search strategy.'
  },
  settings: {
    icon: '⚙️',
    title: 'Job Search Preferences',
    text: 'Update your target roles, industries, salary range, and company preferences. These settings control which companies and jobs the system shows you.',
    tip: 'Changes apply to future searches and daily recommendations.'
  },
  dashboard: {
    icon: '🏠',
    title: 'Your Job Search Overview',
    text: 'Quick stats and recent activity: companies tracked, applications sent, interviews scheduled, and new suggestions.',
    tip: 'Click any stat to see details.'
  }
};

export default function PageDescription({ page }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem(`pageDesc_${page}_dismissed`);
    if (isDismissed === 'true') {
      setIsVisible(false);
    }
  }, [page]);

  const handleDismiss = () => {
    localStorage.setItem(`pageDesc_${page}_dismissed`, 'true');
    setIsVisible(false);
  };

  const desc = descriptions[page];
  if (!desc || !isVisible) return null;

  return (
    <div className="relative bg-gradient-to-br from-[#FFF5E6] to-white border border-[#F7931E] rounded-xl p-6 mb-6">
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-gray-400 hover:text-[#F7931E] transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <span className="text-2xl">{desc.icon}</span>
        {desc.title}
      </h2>

      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        {desc.text}
      </p>

      <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
        <Lightbulb className="w-4 h-4 text-yellow-700 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-yellow-900">
          <span className="font-medium">Tip:</span> {desc.tip}
        </p>
      </div>
    </div>
  );
}