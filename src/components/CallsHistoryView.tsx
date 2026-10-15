import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Clock,
  Trash2,
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CallRecord, UserProfile } from '../types';

interface CallsHistoryViewProps {
  currentUser: UserProfile;
  usersMap: Record<string, UserProfile>;
  onStartCall: (targetUser: UserProfile, type: 'audio' | 'video') => void;
}

export const CallsHistoryView: React.FC<CallsHistoryViewProps> = ({
  currentUser,
  usersMap,
  onStartCall,
}) => {
  const [calls, setCalls] = useState<CallRecord[]>([]);

  useEffect(() => {
    // Listen to calls where currentUser is caller or receiver
    const q = query(
      collection(db, 'calls'),
      where('callerId', '==', currentUser.id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const callerCalls: CallRecord[] = [];
      snapshot.forEach((d) => callerCalls.push({ id: d.id, ...d.data() } as CallRecord));

      // Also query receiver calls
      const qRec = query(
        collection(db, 'calls'),
        where('receiverId', '==', currentUser.id)
      );
      onSnapshot(qRec, (snap2) => {
        const receiverCalls: CallRecord[] = [];
        snap2.forEach((d) => receiverCalls.push({ id: d.id, ...d.data() } as CallRecord));

        const combined = [...callerCalls, ...receiverCalls].sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
        setCalls(combined);
      });
    });

    return () => unsub();
  }, [currentUser.id]);

  const handleDeleteCall = async (callId: string) => {
    try {
      await deleteDoc(doc(db, 'calls', callId));
    } catch (e) {
      console.error(e);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const s = seconds % 60;
    return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 select-none overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Call History</h2>
          <p className="text-xs text-slate-500">Audio and video communications</p>
        </div>
      </div>

      {/* Call list */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        {calls.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 mt-6">
            <Phone className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
            <h4 className="font-bold text-slate-700 text-sm">No call logs yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Start an audio or video call with your contacts anytime.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {calls.map((call) => {
              const isOutgoing = call.callerId === currentUser.id;
              const otherUserId = isOutgoing ? call.receiverId : call.callerId;
              const otherName = isOutgoing ? call.receiverName : call.callerName;
              const otherPhoto = isOutgoing ? call.receiverPhoto : call.callerPhoto;
              const isVideo = call.type === 'video';
              const isMissed = call.status === 'missed' || call.status === 'declined';

              const otherProfile = usersMap[otherUserId] || {
                id: otherUserId,
                fullName: otherName,
                email: '',
                photoURL: otherPhoto,
                online: false,
                lastSeen: '',
                role: 'user',
                createdAt: '',
              };

              return (
                <div
                  key={call.id}
                  className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-sky-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                      <img
                        src={otherPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUserId}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{otherName}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        {isMissed ? (
                          <PhoneMissed className="w-3.5 h-3.5 text-red-500" />
                        ) : isOutgoing ? (
                          <PhoneOutgoing className="w-3.5 h-3.5 text-sky-500" />
                        ) : (
                          <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span>{isVideo ? 'Video' : 'Audio'} Call</span>
                        <span>•</span>
                        <span>{new Date(call.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {call.duration !== undefined && call.duration > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">{formatDuration(call.duration)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Redial action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onStartCall(otherProfile, isVideo ? 'video' : 'audio')}
                      className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
                      title={`Redial ${isVideo ? 'Video' : 'Audio'}`}
                    >
                      {isVideo ? <Video className="w-4 h-4 text-[#19B9F4]" /> : <Phone className="w-4 h-4 text-[#FF1F35]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCall(call.id)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                      title="Delete call record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
