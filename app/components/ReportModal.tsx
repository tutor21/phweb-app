'use client';

import React, { useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Flag, X } from 'lucide-react';

interface ReportModalProps {
  targetId: string;
  targetType: 'post' | 'comment' | 'profile';
  onClose: () => void;
}

export default function ReportModal({ targetId, targetType, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('Inappropriate content');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      status: 'pending'
    });

    if (!error) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 relative space-y-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-black dark:hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-red-500" />
          <h2 className="font-bold text-base">Report {targetType}</h2>
        </div>

        {success ? (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium py-4 text-center">
            Report submitted successfully. Thank you for keeping phweb.app safe.
          </p>
        ) : (
          <form onSubmit={handleReport} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-neutral-500 mb-2">Select Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm focus:outline-none"
              >
                <option value="Inappropriate content">Inappropriate content</option>
                <option value="Harassment or bullying">Harassment or bullying</option>
                <option value="Spam or misleading">Spam or misleading</option>
                <option value="Copyright violation">Copyright violation</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}