import React from 'react';
import { motion } from 'framer-motion';

export default function ScoreGauge({ score, label, size = 'md', color = 'indigo' }) {
  // Size variants
  const sizes = {
    sm: { circle: 80, stroke: 6, text: 'text-xl', label: 'text-xs' },
    md: { circle: 120, stroke: 8, text: 'text-3xl', label: 'text-sm' },
    lg: { circle: 160, stroke: 12, text: 'text-4xl', label: 'text-base' }
  };
  
  const dim = sizes[size];
  const radius = (dim.circle - dim.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  // Color variants for Tailwind (simplified mapping)
  const colors = {
    indigo: { text: 'text-emerald-600', stroke: 'stroke-emerald-600', bg: 'stroke-emerald-100' },
    emerald: { text: 'text-emerald-500', stroke: 'stroke-emerald-500', bg: 'stroke-emerald-100' },
    amber: { text: 'text-amber-500', stroke: 'stroke-amber-500', bg: 'stroke-amber-100' },
    red: { text: 'text-red-500', stroke: 'stroke-red-500', bg: 'stroke-red-100' },
  };
  
  const theme = score === 100 ? colors.emerald : score >= 70 ? colors.indigo : score >= 40 ? colors.amber : colors.red;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: dim.circle, height: dim.circle }}>
        <svg className="transform -rotate-90 w-full h-full">
          {/* Background circle */}
          <circle
            cx={dim.circle / 2}
            cy={dim.circle / 2}
            r={radius}
            strokeWidth={dim.stroke}
            fill="transparent"
            className={`${theme.bg} transition-colors duration-300`}
          />
          {/* Progress circle */}
          <circle
            cx={dim.circle / 2}
            cy={dim.circle / 2}
            r={radius}
            strokeWidth={dim.stroke}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${theme.stroke} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className={`font-black tracking-tight ${theme.text} ${dim.text}`}>
            {Math.round(score)}<span className="text-sm opacity-60 ml-0.5">%</span>
          </span>
        </div>
      </div>
      {label && (
        <span className={`mt-3 font-semibold text-gray-600 uppercase tracking-widest ${dim.label}`}>
          {label}
        </span>
      )}
    </div>
  );
}

