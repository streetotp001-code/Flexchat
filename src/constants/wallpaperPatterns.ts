import React from 'react';

export interface WallpaperPattern {
  id: string;
  name: string;
  category: 'doodle' | 'geometric' | 'minimal' | 'dark';
  description: string;
  isDark?: boolean;
  style: React.CSSProperties;
}

// Crisp, lightweight, encoded SVG patterns for rich chat wallpapers
const DOODLE_SVG = `data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2394a3b8' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round' opacity='0.35'%3E%3Cpath d='M14 18h16a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-8l-5 4v-4h-3a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z'/%3E%3Cpath d='M54 50h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-3l-4 3v-3h-7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z'/%3E%3Ccircle cx='62' cy='22' r='8'/%3E%3Cpath d='M59 20h.01M65 20h.01M59 24q3 3 6 0'/%3E%3Cpath d='M22 58l3-6 5 4 4-7 4 9'/%3E%3Cpath d='M44 14l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z'/%3E%3Cpath d='M18 40a4 4 0 0 1 5-2 4 4 0 0 1 2 5l-7 7-7-7a4 4 0 0 1 2-5 4 4 0 0 1 5 2z'/%3E%3Ccircle cx='40' cy='66' r='3'/%3E%3C/g%3E%3C/svg%3E`;

const DARK_DOODLE_SVG = `data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2338bdf8' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round' opacity='0.25'%3E%3Cpath d='M14 18h16a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-8l-5 4v-4h-3a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z'/%3E%3Cpath d='M54 50h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-3l-4 3v-3h-7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z'/%3E%3Ccircle cx='62' cy='22' r='8'/%3E%3Cpath d='M59 20h.01M65 20h.01M59 24q3 3 6 0'/%3E%3Cpath d='M22 58l3-6 5 4 4-7 4 9'/%3E%3Cpath d='M44 14l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z'/%3E%3Cpath d='M18 40a4 4 0 0 1 5-2 4 4 0 0 1 2 5l-7 7-7-7a4 4 0 0 1 2-5 4 4 0 0 1 5 2z'/%3E%3Ccircle cx='40' cy='66' r='3'/%3E%3C/g%3E%3C/svg%3E`;

const HONEYCOMB_SVG = `data:image/svg+xml,%3Csvg width='48' height='84' viewBox='0 0 48 84' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M24 0l24 14v28L24 56 0 42V14L24 0zm0 84l24-14V42L24 56 0 70v28l24-14z' fill='none' stroke='%2394a3b8' stroke-width='1' opacity='0.28'/%3E%3C/svg%3E`;

const CONSTELLATION_SVG = `data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fbbf24' opacity='0.75'%3E%3Ccircle cx='15' cy='25' r='1.5'/%3E%3Ccircle cx='85' cy='15' r='1'/%3E%3Ccircle cx='60' cy='45' r='2'/%3E%3Ccircle cx='35' cy='75' r='1.2'/%3E%3Ccircle cx='90' cy='80' r='1.5'/%3E%3Ccircle cx='10' cy='85' r='1'/%3E%3Ccircle cx='45' cy='20' r='1'/%3E%3Cpath d='M58 45h4M60 43v4' stroke='%23fbbf24' stroke-width='0.8'/%3E%3Cpath d='M13 25h4M15 23v4' stroke='%23fbbf24' stroke-width='0.8'/%3E%3C/g%3E%3Cpath d='M15 25L45 20L60 45M35 75L60 45L90 80' fill='none' stroke='%2338bdf8' stroke-width='0.6' stroke-dasharray='2,2' opacity='0.25'/%3E%3C/svg%3E`;

const TOPOGRAPHY_SVG = `data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 Q 25 5, 50 20 T 100 20 M0 40 Q 25 25, 50 40 T 100 40 M0 60 Q 25 45, 50 60 T 100 60 M0 80 Q 25 65, 50 80 T 100 80' fill='none' stroke='%23059669' stroke-width='1' opacity='0.18'/%3E%3C/svg%3E`;

const CIRCUIT_SVG = `data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2306b6d4' stroke-width='1.2' opacity='0.35'%3E%3Cpath d='M10 10h20v20h20M60 20h10v30H50M20 50h20v20'/%3E%3Ccircle cx='50' cy='30' r='2.5' fill='%2306b6d4'/%3E%3Ccircle cx='50' cy='50' r='2.5' fill='%2306b6d4'/%3E%3Ccircle cx='20' cy='70' r='2' fill='%2306b6d4'/%3E%3Ccircle cx='70' cy='50' r='2' fill='%2306b6d4'/%3E%3C/g%3E%3C/svg%3E`;

export const PREDEFINED_WALLPAPER_PATTERNS: WallpaperPattern[] = [
  {
    id: 'pattern-doodle-light',
    name: 'Classic Chat Doodles',
    category: 'doodle',
    description: 'Iconic messaging icons, speech bubbles, and friendly stickers',
    isDark: false,
    style: {
      backgroundColor: '#f8fafc',
      backgroundImage: `url("${DOODLE_SVG}")`,
      backgroundSize: '80px 80px',
      backgroundRepeat: 'repeat',
    },
  },
  {
    id: 'pattern-dots-modern',
    name: 'Polka Dots Matrix',
    category: 'geometric',
    description: 'Clean minimalist dot matrix with subtle slate accents',
    isDark: false,
    style: {
      backgroundColor: '#f8fafc',
      backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)',
      backgroundSize: '22px 22px',
      backgroundRepeat: 'repeat',
    },
  },
  {
    id: 'pattern-graph-grid',
    name: 'Blueprint Graph Grid',
    category: 'geometric',
    description: 'Precision architectural millimeter graph grid lines',
    isDark: false,
    style: {
      backgroundColor: '#f8fafc',
      backgroundImage:
        'linear-gradient(to right, #e2e8f0 1.2px, transparent 1.2px), linear-gradient(to bottom, #e2e8f0 1.2px, transparent 1.2px)',
      backgroundSize: '24px 24px',
      backgroundRepeat: 'repeat',
    },
  },
  {
    id: 'pattern-diagonal-stripes',
    name: 'Diagonal Micro-Stripes',
    category: 'minimal',
    description: 'Crisp dynamic diagonal soft ribbon stripes',
    isDark: false,
    style: {
      backgroundColor: '#f8fafc',
      backgroundImage:
        'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 12px, #f8fafc 12px, #f8fafc 24px)',
      backgroundRepeat: 'repeat',
    },
  },
  {
    id: 'pattern-honeycomb-hex',
    name: 'Honeycomb Hexagon',
    category: 'geometric',
    description: 'Interlocking geometric honeycomb tech mesh',
    isDark: false,
    style: {
      backgroundColor: '#f1f5f9',
      backgroundImage: `url("${HONEYCOMB_SVG}")`,
      backgroundSize: '48px 84px',
      backgroundRepeat: 'repeat',
    },
  },
  {
    id: 'pattern-warm-cream-doodle',
    name: 'Warm Amber Doodles',
    category: 'doodle',
    description: 'Cozy cream chat atmosphere with amber undertones',
    isDark: false,
    style: {
      backgroundColor: '#fffbeb',
      backgroundImage: `url("${DOODLE_SVG}")`,
      backgroundSize: '80px 80px',
      backgroundRepeat: 'repeat',
    },
  },
  {
    id: 'pattern-mint-topography',
    name: 'Mint Elevation Contours',
    category: 'minimal',
    description: 'Calming mint topographic contour landscape curves',
    isDark: false,
    style: {
      backgroundColor: '#f0fdf4',
      backgroundImage: `url("${TOPOGRAPHY_SVG}")`,
      backgroundSize: '100px 100px',
      backgroundRepeat: 'repeat',
    },
  },
  {
    id: 'pattern-celestial-stars',
    name: 'Midnight Celestial Stars',
    category: 'dark',
    description: 'Deep navy midnight sky with gold stars and constellations',
    isDark: true,
    style: {
      backgroundColor: '#0a0f1d',
      backgroundImage: `url("${CONSTELLATION_SVG}")`,
      backgroundSize: '100px 100px',
      backgroundRepeat: 'repeat',
    },
  },
  {
    id: 'pattern-dark-doodle',
    name: 'Cyber Dark Doodles',
    category: 'dark',
    description: 'Sleek neon cyan chat doodles on deep graphite obsidian',
    isDark: true,
    style: {
      backgroundColor: '#0f172a',
      backgroundImage: `url("${DARK_DOODLE_SVG}")`,
      backgroundSize: '80px 80px',
      backgroundRepeat: 'repeat',
    },
  },
  {
    id: 'pattern-circuit-board',
    name: 'Tech Circuit Board',
    category: 'dark',
    description: 'Futuristic integrated microcircuit board traces',
    isDark: true,
    style: {
      backgroundColor: '#080d1a',
      backgroundImage: `url("${CIRCUIT_SVG}")`,
      backgroundSize: '80px 80px',
      backgroundRepeat: 'repeat',
    },
  },
];

/**
 * Resolves a background value or pattern ID into a complete React CSSProperties object.
 */
export const resolveWallpaperStyle = (
  background?: string,
  patternId?: string
): React.CSSProperties => {
  // 1. Check if patternId matches a pre-defined pattern
  if (patternId) {
    const matched = PREDEFINED_WALLPAPER_PATTERNS.find((p) => p.id === patternId);
    if (matched) return { ...matched.style };
  }

  // 2. Check if background matches a pre-defined pattern ID
  if (background && background.startsWith('pattern-')) {
    const matched = PREDEFINED_WALLPAPER_PATTERNS.find((p) => p.id === background);
    if (matched) return { ...matched.style };
  }

  // 3. Fallback to custom background string (image, gradient, or color)
  if (!background || background === '#f8fafc') {
    return { backgroundColor: '#f8fafc' };
  }

  if (background.startsWith('http') || background.startsWith('data:image')) {
    return {
      backgroundImage: `url(${background})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }

  if (background.includes('gradient')) {
    return { background: background };
  }

  return { backgroundColor: background };
};
