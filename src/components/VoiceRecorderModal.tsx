import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Check, Play, Pause, Trash2 } from 'lucide-react';
import { sounds } from '../utils/audioChimes';

interface VoiceRecorderModalProps {
  recipientName: string;
  recipientPhoto?: string;
  onSend: (audioBase64: string, durationSeconds: number) => void;
  onClose: () => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  recipientName,
  recipientPhoto,
  onSend,
  onClose,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 40, 20, 60, 45, 80, 50, 30, 20, 40, 65, 85, 45, 30, 15]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Start recording on mount
  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
  };

  const startRecording = async () => {
    try {
      setPermissionError(null);
      setSeconds(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      sounds.playRecordingStart();

      // Audio analysis for live waveform
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const updateWaveform = () => {
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const bars = Array.from(dataArray.slice(0, 18)).map((val) => Math.max(12, Math.min(85, (val / 255) * 85)));
            setAudioLevels(bars);
          }
          animFrameRef.current = requestAnimationFrame(updateWaveform);
        };
        updateWaveform();
      }

      // MediaRecorder
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        sounds.playRecordingStop();
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all mic tracks
        stream.getTracks().forEach((track) => track.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      recorder.start(100);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setPermissionError('Microphone permission is required to record voice notes. Please grant access in your browser settings.');
    }
  };

  const stopAndPreview = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTogglePlayPreview = () => {
    if (!audioUrl) return;
    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(audioUrl);
      audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSend = async () => {
    let blobToSend = audioBlob;

    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Need to stop recorder first
      stopAndPreview();
      // Wait for blob
      await new Promise((resolve) => setTimeout(resolve, 300));
      blobToSend = new Blob(chunksRef.current, { type: 'audio/webm' });
    }

    if (!blobToSend || blobToSend.size === 0) {
      onClose();
      return;
    }

    // Convert blob to base64 data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onSend(base64, Math.max(1, seconds));
      onClose();
    };
    reader.readAsDataURL(blobToSend);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col justify-between p-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-100 flex-shrink-0">
            {recipientPhoto ? (
              <img src={recipientPhoto} alt={recipientName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">
                {recipientName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{recipientName}</h3>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Voice Note</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Recording Center Content (matching screen 5) */}
      <div className="flex flex-col items-center justify-center text-center my-auto">
        {permissionError ? (
          <div className="max-w-xs p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-200">
            {permissionError}
          </div>
        ) : (
          <>
            {/* Concentric Pulsing Mic Button */}
            <div className="relative flex items-center justify-center mb-6">
              {isRecording && (
                <>
                  <div className="absolute w-44 h-44 rounded-full bg-red-100 animate-ping opacity-30" />
                  <div className="absolute w-36 h-36 rounded-full bg-red-100/60" />
                  <div className="absolute w-28 h-28 rounded-full bg-red-200/50" />
                </>
              )}
              <div
                onClick={isRecording ? stopAndPreview : handleTogglePlayPreview}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
                  isRecording ? 'bg-[#FF1F35] text-white shadow-red-200' : 'bg-sky-500 text-white shadow-sky-200'
                }`}
              >
                {isRecording ? (
                  <Mic className="w-9 h-9 animate-pulse" />
                ) : isPlayingPreview ? (
                  <Pause className="w-9 h-9" />
                ) : (
                  <Play className="w-9 h-9 ml-1" />
                )}
              </div>
            </div>

            {/* Status text & timer */}
            <h4 className="text-base font-semibold text-slate-800">
              {isRecording ? 'Recording...' : 'Recorded Voice Note'}
            </h4>
            <div className="text-3xl font-bold text-slate-900 tracking-tight my-2">
              {formatTime(seconds)}
            </div>

            {/* Audio Waveform Graphic */}
            <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs px-4">
              {audioLevels.map((height, i) => (
                <div
                  key={i}
                  style={{ height: `${height}%` }}
                  className={`w-1.5 rounded-full transition-all duration-75 ${
                    isRecording ? 'bg-[#FF1F35]' : 'bg-sky-400'
                  }`}
                />
              ))}
            </div>

            {/* Quick action: Re-record if stopped */}
            {!isRecording && audioBlob && (
              <button
                type="button"
                onClick={startRecording}
                className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 py-1 px-3 bg-slate-100 rounded-full"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" /> Discard & Record Again
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom Controls Bar (Cancel & Send) */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-colors"
        >
          <X className="w-5 h-5" />
          <span>Cancel</span>
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={!!permissionError}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#FF1F35] hover:bg-[#e0192d] active:bg-[#c91426] text-white font-bold rounded-2xl text-sm shadow-md shadow-red-200 transition-transform active:scale-95 disabled:opacity-50"
        >
          <div className="w-5 h-5 rounded-full bg-white text-[#FF1F35] flex items-center justify-center">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};
