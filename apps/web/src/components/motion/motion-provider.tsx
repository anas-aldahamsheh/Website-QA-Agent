'use client';

import Lenis from 'lenis';
import { MotionConfig } from 'motion/react';
import { useEffect, type ReactNode } from 'react';

// One place for app-wide motion: honours the visitor's reduced-motion setting, adds inertial
// scrolling on pointer devices, and feeds the pointer position to panels for their spotlight.
export function MotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    let lenis: Lenis | null = null;
    let frame = 0;
    if (!reduce && !coarse) {
      lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), wheelMultiplier: 0.95 });
      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    }

    const onPointerMove = (event: PointerEvent) => {
      const panel = (event.target as Element | null)?.closest?.('.panel') as HTMLElement | null;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      panel.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
