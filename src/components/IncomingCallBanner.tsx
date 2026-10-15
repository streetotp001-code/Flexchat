import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { CallRecord } from '../types';
import { sounds } from '../utils/audioChimes';

interface IncomingCallBannerProps {
  call: CallRecord;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallBanner: React.FC<IncomingCallBannerProps> = ({
  call,
  onAccept,
  onDecline,
}) => {
  useEffect(() => {
    sounds.startIncomingRingtone();
    return () => {
      sounds.stopRingtone();
    };
  }, []);

  const isVideo = call.type === 'video';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-white shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Avatar with pulse */}
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-sky-500 animate-ping opacity-40" />
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-sky-400 shadow-xl bg-slate-800">
              <img
                src={call.callerPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${call.callerId}`}
                alt={call.callerName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <h3 className="text-xl font-bold tracking-tight">{call.callerName}</h3>
          <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold mt-1">
            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            <span>Incoming {isVideo ? 'Video' : 'Audio'} Call...</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-10 mt-8 w-full">
            {/* Decline */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onDecline}
                className="w-16 h-16 rounded-full bg-[#FF1F35] hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-transform active:scale-90"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <span className="text-xs text-slate-300 font-medium">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onAccept}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform active:scale-90 animate-bounce"
              >
                {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
              </button>
              <span className="text-xs text-slate-300 font-medium">Accept</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
