import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  layout = 'horizontal',
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  };

  const subSizes = {
    sm: 'text-[9px] tracking-wider',
    md: 'text-xs tracking-widest',
    lg: 'text-sm tracking-widest font-semibold',
    xl: 'text-base tracking-widest font-bold',
  };

  return (
    <div
      className={`inline-flex items-center ${
        layout === 'vertical' ? 'flex-col text-center gap-3' : 'flex-row gap-3'
      } ${className}`}
    >
      {/* Icon: 3 overlapping chat bubbles with 3 dots */}
      <div className={`relative flex-shrink-0 ${iconSizes[size]} filter drop-shadow-sm`}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Top-Left Yellow Bubble */}
          <path
            d="M20 38C20 25.8497 29.8497 16 42 16H52C64.1503 16 74 25.8497 74 38C74 50.1503 64.1503 60 52 60H34L20 70V38Z"
            fill="#FFD51B"
          />

          {/* Right Sky Blue Bubble */}
          <path
            d="M38 46C38 34.9543 46.9543 26 58 26H68C79.0457 26 88 34.9543 88 46C88 57.0457 79.0457 66 68 66H52L40 76V52C38.7424 50.2173 38 48.0673 38 46Z"
            fill="#19B9F4"
          />

          {/* Front Main Red Bubble */}
          <path
            d="M12 48C12 34.7452 22.7452 24 36 24H54C67.2548 24 78 34.7452 78 48C78 61.2548 67.2548 72 54 72H32L16 84V56C13.4883 53.6496 12 50.9427 12 48Z"
            fill="#FF1F35"
          />

          {/* Three White Dots inside Red Bubble */}
          <circle cx="34" cy="48" r="4.5" fill="#FFFFFF" />
          <circle cx="45" cy="48" r="4.5" fill="#FFFFFF" />
          <circle cx="56" cy="48" r="4.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col select-none">
        <div className={`font-black tracking-tight leading-none ${textSizes[size]}`}>
          <span style={{ color: '#FF1F35' }}>FLEX</span>
          <span style={{ color: '#19B9F4' }}>chat</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          <span className="w-2.5 h-0.5 rounded-full bg-[#FFD51B]" />
          <span className={`uppercase font-bold text-slate-800 ${subSizes[size]}`}>by CYCM</span>
          <span className="w-2.5 h-0.5 rounded-full bg-[#FFD51B]" />
        </div>
        {showTagline && (
          <p className="text-xs text-slate-500 font-medium mt-1">Chat. Call. Be Closer.</p>
        )}
      </div>
    </div>
  );
};
