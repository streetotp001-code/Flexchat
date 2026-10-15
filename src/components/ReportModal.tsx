import React, { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';

interface ReportModalProps {
  reportedUser: UserProfile;
  currentUser: UserProfile;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  reportedUser,
  currentUser,
  onClose,
}) => {
  const [reason, setReason] = useState('Harassment or Bullying');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const reasons = [
    'Harassment or Bullying',
    'Spam or Scam',
    'Inappropriate Media',
    'Impersonation',
    'Other Problem',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser.id,
        reporterEmail: currentUser.email,
        reportedUserId: reportedUser.id,
        reportedUserName: reportedUser.fullName,
        reason,
        details: details.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 text-[#FF1F35] rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Report User</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center text-emerald-600">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-600">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Report Received</h4>
            <p className="text-xs text-slate-500 mt-1">
              Thank you. Our administrators will review this report promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-600">
              Reporting <strong className="text-slate-900">{reportedUser.fullName}</strong>. Please select the primary reason:
            </p>

            <div className="space-y-1.5">
              {reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    reason === r ? 'bg-red-50 text-red-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                    className="accent-[#FF1F35]"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Details (Optional)</label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain what happened..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF1F35]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#FF1F35] hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
