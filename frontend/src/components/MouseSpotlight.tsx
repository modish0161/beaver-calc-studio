import React, { useEffect, useRef } from 'react';

/**
 * A mouse-following radial-gradient spotlight overlay.
 * Uses a ref to update the DOM directly — no React re-renders on mouse move.
 */
const MouseSpotlight: React.FC<{
  /** CSS color for the gradient, e.g. 'rgba(0,217,255,0.15)' */
  color?: string;
  /** Gradient radius in px */
  size?: number;
  className?: string;
}> = ({
  color = 'rgba(0,217,255,0.15)',
  size = 600,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      el.style.background = `radial-gradient(${size}px circle at ${e.clientX}px ${e.clientY}px, ${color}, transparent 70%)`;
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [color, size]);

  return <div ref={ref} className={`absolute inset-0 pointer-events-none ${className}`} />;
};

export default MouseSpotlight;
