'use client';
import { useTheme } from '@/lib/useTheme';

/**
 * The sun / moon switch, the same everywhere (the intro, the world, the
 * rooms, /projects and the case studies). It flips <html data-theme> for the
 * whole site and remembers the choice (see src/lib/theme.js).
 */

function Sun() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10" cy="10" r="3.6" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return <line key={a} x1={10 + Math.cos(r) * 6.2} y1={10 + Math.sin(r) * 6.2} x2={10 + Math.cos(r) * 8.2} y2={10 + Math.sin(r) * 8.2} />;
      })}
    </svg>
  );
}

function Moon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M16.2 12.4A6.6 6.6 0 0 1 7.6 3.8a6.6 6.6 0 1 0 8.6 8.6Z" />
    </svg>
  );
}

export default function ThemeToggle({ className = '' }) {
  const [theme, onToggle] = useTheme();
  const light = theme === 'light';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      title={light ? 'Dark mode' : 'Light mode'}
      className={`relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-ink-muted transition-[background-color,color,transform] duration-200 hover:bg-surface-2 hover:text-ink active:scale-[0.94] ${className}`}
    >
      <span className={`absolute transition-[opacity,transform] duration-300 ${light ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}>
        <Moon />
      </span>
      <span className={`absolute transition-[opacity,transform] duration-300 ${light ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`}>
        <Sun />
      </span>
    </button>
  );
}
