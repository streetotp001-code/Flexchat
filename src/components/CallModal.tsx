import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RefreshCw,
  Grid,
} from 'lucide-react';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CallRecord } from '../types';
import { sounds } from '../utils/audioChimes';

interface CallModalProps {
  callId: string;
  isCaller: boolean;
  currentUser: { id: string; fullName: string; photoURL?: string };
  targetUser: { id: string; fullName: string; photoURL?: string };
  callType: 'audio' | 'video';
  onEndCall: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const CallModal: React.FC<CallModalProps> = ({
  callId,
  isCaller,
  currentUser,
  targetUser,
  callType,
  onEndCall,
}) => {
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>('calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [hasCameraError, setHasCameraError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    initCall();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    sounds.stopRingtone();
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const initCall = async () => {
    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;

      // Handle remote tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        }
      };

      // Get user media
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video' ? { facingMode: 'user' } : false,
        });
      } catch (err: any) {
        console.warn('Could not acquire requested media stream, attempting audio only:', err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasCameraError('Camera access unavailable. Continuing call as audio-only.');
      }

      localStreamRef.current = stream;
      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle ICE Candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          const callRef = doc(db, 'calls', callId);
          try {
            const snap = await getDoc(callRef);
            if (snap.exists()) {
              const data = snap.data();
              const candidateStr = JSON.stringify(event.candidate.toJSON());
              if (isCaller) {
                const existing = data.callerCandidates || [];
                await updateDoc(callRef, { callerCandidates: [...existing, candidateStr] });
              } else {
                const existing = data.receiverCandidates || [];
                await updateDoc(callRef, { receiverCandidates: [...existing, candidateStr] });
              }
            }
          } catch (e) {
            console.error('Failed to update ICE candidate:', e);
          }
        }
      };

      // Caller vs Receiver setup
      if (isCaller) {
        sounds.startOutgoingTone();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await setDoc(doc(db, 'calls', callId), {
          id: callId,
          callerId: currentUser.id,
          callerName: currentUser.fullName,
          callerPhoto: currentUser.photoURL || '',
          receiverId: targetUser.id,
          receiverName: targetUser.fullName,
          receiverPhoto: targetUser.photoURL || '',
          type: callType,
          status: 'calling',
          startedAt: new Date().toISOString(),
          offer: JSON.stringify(offer),
          callerCandidates: [],
          receiverCandidates: [],
        });
      }

      // Listen for remote signal updates
      const unsub = onSnapshot(doc(db, 'calls', callId), async (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data() as CallRecord;

        if (data.status === 'ended' || data.status === 'declined') {
          setCallStatus('ended');
          sounds.stopRingtone();
          setTimeout(onEndCall, 1200);
          return;
        }

        if (isCaller) {
          if (data.answer && pc.signalingState !== 'stable') {
            const answerDesc = new RTCSessionDescription(JSON.parse(data.answer));
            await pc.setRemoteDescription(answerDesc);
            setCallStatus('connected');
            sounds.stopRingtone();
            startDurationTimer();
          }

          if (data.receiverCandidates && data.receiverCandidates.length > 0) {
            for (const candStr of data.receiverCandidates) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr)));
              } catch {}
            }
          }
        } else {
          // Receiver:
          if (data.offer && pc.signalingState === 'stable' && callStatus === 'calling') {
            const offerDesc = new RTCSessionDescription(JSON.parse(data.offer));
            await pc.setRemoteDescription(offerDesc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await updateDoc(doc(db, 'calls', callId), {
              answer: JSON.stringify(answer),
              status: 'connected',
              connectedAt: new Date().toISOString(),
            });

            setCallStatus('connected');
            sounds.stopRingtone();
            startDurationTimer();
          }

          if (data.callerCandidates && data.callerCandidates.length > 0) {
            for (const candStr of data.callerCandidates) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candStr)));
              } catch {}
            }
          }
        }
      });

      return () => unsub();
    } catch (err: any) {
      console.error('Call initialization error:', err);
      setHasCameraError('Unable to start WebRTC session: ' + err.message);
    }
  };

  const startDurationTimer = () => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    durationTimerRef.current = window.setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleEndCall = async () => {
    sounds.stopRingtone();
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'ended',
        endedAt: new Date().toISOString(),
        duration,
      });
    } catch {}
    setCallStatus('ended');
    cleanup();
    onEndCall();
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const isVideo = callType === 'video';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col justify-between overflow-hidden">
      {/* Hidden audio element for audio stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* VIDEO CALL LAYOUT */}
      {isVideo ? (
        <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-6">
          {/* Main Remote Video Screen */}
          <div className="absolute inset-0 bg-slate-950 flex items-center justify-center overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Fallback avatar if remote video track not active yet */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm pointer-events-none">
              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-white/20 overflow-hidden flex items-center justify-center mb-3">
                {targetUser.photoURL ? (
                  <img src={targetUser.photoURL} alt={targetUser.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold">{targetUser.fullName.charAt(0)}</span>
                )}
              </div>
              <h2 className="text-xl font-bold">{targetUser.fullName}</h2>
              <p className="text-xs text-sky-400 mt-1 font-medium">
                {callStatus === 'connected' ? `Connected • ${formatDuration(duration)}` : 'Connecting video call...'}
              </p>
            </div>
          </div>

          {/* Local User PIP preview (matches mockup screen 6) */}
          <div className="absolute bottom-28 right-4 w-28 sm:w-36 h-40 sm:h-48 bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${isVideoOff ? 'hidden' : 'block'}`}
            />
            {isVideoOff && (
              <div className="w-full h-full flex items-center justify-center bg-slate-700 text-xs text-slate-300">
                Camera Off
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white font-medium">
              You
            </div>
          </div>

          {/* Top Info Bar */}
          <div className="relative z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                <img src={targetUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.id}`} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{targetUser.fullName}</h3>
                <p className="text-xs text-slate-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Video Call... {callStatus === 'connected' && `(${formatDuration(duration)})`}
                </p>
              </div>
            </div>
          </div>

          {hasCameraError && (
            <div className="relative z-10 mx-auto bg-amber-500/90 text-white text-xs px-3 py-1.5 rounded-full shadow-md">
              {hasCameraError}
            </div>
          )}

          {/* Bottom Floating Control Bar */}
          <div className="relative z-10 flex items-center justify-center gap-4 bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-3xl mx-auto max-w-sm border border-white/10 shadow-2xl mb-2">
            {/* Toggle Mic */}
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-full transition-transform active:scale-95 ${
                isMuted ? 'bg-red-500/30 text-red-400 border border-red-500' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Toggle Camera */}
            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-full transition-transform active:scale-95 ${
                isVideoOff ? 'bg-red-500/30 text-red-400 border border-red-500' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Hangup Red Button */}
            <button
              onClick={handleEndCall}
              className="p-4 rounded-full bg-[#FF1F35] text-white hover:bg-red-700 shadow-lg shadow-red-600/40 transition-transform active:scale-90"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        /* AUDIO CALL LAYOUT (matching mockup screen 7) */
        <div className="relative w-full h-full flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-b from-sky-500 via-sky-600 to-sky-700">
          {/* Top user title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-white/40 overflow-hidden flex-shrink-0">
              <img src={targetUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.id}`} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{targetUser.fullName}</h2>
              <p className="text-xs text-sky-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                {callStatus === 'connected' ? `Connected • ${formatDuration(duration)}` : 'Audio Call...'}
              </p>
            </div>
          </div>

          {/* Central Avatar with Ripple animation */}
          <div className="flex flex-col items-center justify-center my-auto">
            <div className="relative flex items-center justify-center mb-6">
              {/* Concentric ripple rings */}
              <div className="absolute w-64 h-64 rounded-full bg-white/10 animate-ping opacity-30" />
              <div className="absolute w-52 h-52 rounded-full bg-white/15 animate-pulse" />
              <div className="absolute w-40 h-40 rounded-full bg-white/25" />
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white">
                <img
                  src={targetUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.id}`}
                  alt={targetUser.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h3 className="text-2xl font-bold tracking-tight">{targetUser.fullName}</h3>
            <p className="text-sm text-sky-100 font-medium mt-1">
              {callStatus === 'connected' ? formatDuration(duration) : 'Ringing...'}
            </p>
          </div>

          {/* Controls: Mute, Keypad, Speaker, Hangup */}
          <div className="flex flex-col items-center gap-8 mb-6">
            <div className="flex items-center justify-center gap-8">
              {/* Mute */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                    isMuted ? 'bg-red-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <span className="text-xs font-semibold text-sky-100">Mute</span>
              </div>

              {/* Keypad */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => sounds.playBeep(800, 0.1)}
                  className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                >
                  <Grid className="w-6 h-6" />
                </button>
                <span className="text-xs font-semibold text-sky-100">Keypad</span>
              </div>

              {/* Speaker */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                    !isSpeakerOn ? 'bg-white/10 text-white/50' : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                >
                  {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                </button>
                <span className="text-xs font-semibold text-sky-100">Speaker</span>
              </div>
            </div>

            {/* Hangup Red button */}
            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-[#FF1F35] hover:bg-red-700 text-white flex items-center justify-center shadow-xl shadow-red-950/30 transition-transform active:scale-90"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
