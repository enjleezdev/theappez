
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Logo based on the user-provided image: Orange house outline with orange workflow icon
const SplashScreenLogo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-32 w-32 text-primary", className)} // text-primary makes it orange
  >
    {/* Outer house outline */}
    <path d="M3 21V10l9-6 9 6v11" />
    {/* Inner workflow icon (simplified representation of connected rounded squares) */}
    <g transform="translate(0 -1)"> {/* Slight adjustment to center workflow better */}
      <rect x="7" y="10" width="4.5" height="4.5" rx="1" strokeWidth="1.2"/>
      <rect x="12.5" y="14.5" width="4.5" height="4.5" rx="1" strokeWidth="1.2"/>
      <path d="M9.25 14.5v-2a1 1 0 0 1 1-1h2.25" strokeWidth="1.2"/>
    </g>
  </svg>
);

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background animate-fadeIn">
      <SplashScreenLogo />
      <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl font-serif">
        <span className="text-accent">EZ</span> <span className="text-red-400">Inventory</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        powered by{' '}
        <a
          href="https://www.enjleez.tech/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-red-400 hover:underline"
        >
          ENJLEEZ TECH
        </a>
      </p>
    </div>
  );
}
