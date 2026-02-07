import React from "react";
import { Users } from "lucide-react";

const ROLE_SCORES = {
  'CEO': 100,
  'Chief Executive Officer': 100,
  'CTO': 95,
  'Chief Technology Officer': 95,
  'CFO': 90,
  'Chief Financial Officer': 90,
  'COO': 90,
  'Chief Operating Officer': 90,
  'CMO': 85,
  'Chief Marketing Officer': 85,
  'VP': 80,
  'Vice President': 80,
  'Director': 70,
  'Head of': 75,
  'Manager': 50,
  'Senior Manager': 60,
  'Engineer': 40,
  'Analyst': 30
};

function getRelevanceScore(title) {
  if (!title) return 0;
  
  for (const [key, score] of Object.entries(ROLE_SCORES)) {
    if (title.includes(key)) {
      return score;
    }
  }
  
  return 20; // Default low score for unrecognized roles
}

function getRelevanceLevel(score) {
  if (score >= 80) return { label: "High", color: "bg-emerald-100 text-emerald-700" };
  if (score >= 60) return { label: "Medium", color: "bg-amber-100 text-amber-700" };
  return { label: "Low", color: "bg-gray-100 text-gray-600" };
}

export default function ContactRoleRelevance({ contacts = [] }) {
  const validContacts = contacts.filter(c => c.title);
  
  if (validContacts.length === 0) {
    return (
      <div className="text-xs text-gray-500 px-3 py-2 bg-gray-50 rounded-lg">
        No roles identified
      </div>
    );
  }

  const topContact = validContacts.reduce((best, current) => {
    const bestScore = getRelevanceScore(best.title);
    const currentScore = getRelevanceScore(current.title);
    return currentScore > bestScore ? current : best;
  });

  const topScore = getRelevanceScore(topContact.title);
  const relevanceLevel = getRelevanceLevel(topScore);

  return (
    <div className="flex items-center gap-2">
      <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 font-medium truncate">
          {topContact.full_name}
        </p>
        <p className="text-xs text-gray-600 truncate">{topContact.title}</p>
      </div>
      <span className={`px-2 py-1 rounded text-xs font-semibold shrink-0 ${relevanceLevel.color}`}>
        {relevanceLevel.label}
      </span>
    </div>
  );
}