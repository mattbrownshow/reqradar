import React from "react";
import { CheckCircle2, MessageSquare, TrendingUp } from "lucide-react";

export default function TierOneMetrics({ interviews, replies, messagesSent }) {
  const interviewRate = messagesSent > 0 ? ((interviews / messagesSent) * 100).toFixed(2) : 0;
  const replyRate = messagesSent > 0 ? ((replies / messagesSent) * 100).toFixed(2) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Interviews Booked */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">Interviews Booked</h3>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="text-5xl font-bold text-emerald-600 mb-2">{interviews}</div>
            <p className="text-sm text-gray-600">Conversion: <span className="font-semibold text-emerald-600">{interviewRate}%</span></p>
            <p className="text-xs text-gray-500 mt-1">({interviews} of {messagesSent} messages)</p>
          </div>
          
          <div className="pt-3 border-t border-emerald-200">
            <p className="text-xs text-gray-600 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>Primary success metric</span>
            </p>
          </div>
        </div>
      </div>

      {/* Replies Received */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">Replies Received</h3>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="text-5xl font-bold text-purple-600 mb-2">{replies}</div>
            <p className="text-sm text-gray-600">Response Rate: <span className="font-semibold text-purple-600">{replyRate}%</span></p>
            <p className="text-xs text-gray-500 mt-1">({replies} of {messagesSent} messages)</p>
          </div>
          
          <div className="pt-3 border-t border-purple-200">
            <p className="text-xs text-gray-600 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-purple-600" />
              <span>Engagement indicator</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}