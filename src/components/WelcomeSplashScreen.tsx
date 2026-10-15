import React from 'react';
import { MessageSquare, Mic, Video, Phone, Users, ArrowRight } from 'lucide-react';
import { Logo } from './Logo';

interface WelcomeSplashScreenProps {
  onGetStarted: () => void;
}

export const WelcomeSplashScreen: React.FC<WelcomeSplashScreenProps> = ({ onGetStarted }) => {
  const features = [
    {
      icon: MessageSquare,
      color: 'bg-[#FF1F35] text-white',
      title: 'Send Messages',
      desc: 'Text, photos, videos & more',
    },
    {
      icon: Mic,
      color: 'bg-[#FFD51B] text-slate-900',
      title: 'Voice Note',
      desc: 'Send and listen to voice messages',
    },
    {
      icon: Video,
      color: 'bg-[#19B9F4] text-white',
      title: 'Video Call',
      desc: 'Face to face, anytime',
    },
    {
      icon: Phone,
      color: 'bg-[#FF1F35] text-white',
      title: 'Audio Call',
      desc: 'Clear and reliable calls',
    },
    {
      icon: Users,
      color: 'bg-[#19B9F4] text-white',
      title: 'Add Friends',
      desc: 'Connect with Gmail address',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between relative overflow-hidden select-none">
      {/* Top Section with Logo & Tagline (matching mockup screen 8) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full z-10">
        <div className="mb-4">
          <Logo size="lg" layout="vertical" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 mb-6 text-center">
          Chat. Call. Be Closer.
        </h2>

        {/* Feature list */}
        <div className="w-full space-y-3.5 mb-8">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-sky-200 transition-colors"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-xs flex-shrink-0 ${item.color}`}>
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm leading-tight">{item.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={onGetStarted}
          className="w-full py-3.5 px-6 bg-[#FF1F35] hover:bg-[#e0192d] active:bg-[#c91426] text-white font-bold rounded-2xl text-base shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Decorative Wave Footer (matching mockup) */}
      <div className="relative w-full h-16 sm:h-20 overflow-hidden pointer-events-none">
        <svg
          viewBox="0 0 500 100"
          preserveAspectRatio="none"
          className="w-full h-full absolute bottom-0 left-0"
        >
          <path d="M0,40 C150,95 350,10 500,60 L500,100 L0,100 Z" fill="#19B9F4" />
          <path d="M0,60 C120,20 280,90 500,50 L500,100 L0,100 Z" fill="#FFD51B" opacity="0.9" />
          <path d="M0,75 C90,45 220,100 420,70 L500,85 L500,100 L0,100 Z" fill="#FF1F35" />
        </svg>
        <div className="absolute bottom-2 right-4 text-white text-[10px] font-bold tracking-widest uppercase z-10 opacity-90">
          by CYCM
        </div>
      </div>
    </div>
  );
};
