'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { SplitWords, easeOutExpo } from '@/components/motion/primitives';

// The header block of every page: breadcrumb readout, a headline that rises word by word,
// and a subtitle that fades in behind it.
export function PageIntro({ crumb, title, subtitle, side }: { crumb: string; title: string; subtitle: string; side?: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <motion.div
          className="eyebrow flex items-center gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-pulse-ring absolute inset-0 rounded-full bg-primary" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          {crumb}
        </motion.div>
        <h1 className="display mt-3 text-[42px] leading-[0.95] sm:text-6xl xl:text-7xl">
          <SplitWords text={title} delay={0.1} />
        </h1>
        <motion.p
          className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground"
          initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, ease: easeOutExpo, delay: 0.35 }}
        >
          {subtitle}
        </motion.p>
      </div>
      {side ? (
        <motion.div
          className="flex flex-wrap items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.45 }}
        >
          {side}
        </motion.div>
      ) : null}
    </div>
  );
}
