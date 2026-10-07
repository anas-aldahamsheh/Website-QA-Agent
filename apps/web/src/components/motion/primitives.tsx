'use client';

import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform, type Variants } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

// Sections rise out of a soft blur as they enter the viewport. Children marked with RevealItem
// follow one after another so a panel assembles instead of popping in.
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  shown: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transitionEnd: { filter: 'none' },
    transition: { duration: 0.9, ease: easeOutExpo, delay, when: 'beforeChildren', staggerChildren: 0.06 }
  })
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOutExpo } }
};

export function Reveal({ children, className, delay = 0, as = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' }) {
  const Component = as === 'section' ? motion.section : motion.div;
  return (
    <Component
      className={className}
      variants={revealVariants}
      custom={delay}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
    >
      {children}
    </Component>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

// Numbers count up from zero the first time they are seen, then glide to new values.
export function CountUp({ value, className, format }: { value: number; className?: string; format?: (value: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const previous = useRef(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(previous.current, value, {
      duration: Math.min(1.8, 0.6 + Math.log10(Math.abs(value - previous.current) + 1) * 0.5),
      ease: easeOutExpo,
      onUpdate: (latest) => setDisplay(latest)
    });
    previous.current = value;
    return () => controls.stop();
  }, [inView, reduce, value]);

  const rounded = Math.round(display);
  return (
    <span ref={ref} className={`tabular-nums ${className ?? ''}`}>
      {format ? format(rounded) : rounded.toLocaleString('en-US')}
    </span>
  );
}

const glyphs = '01<>/{}[]#%$&*+=?ABCDEFGHJKLMNPQRSTUVWXYZ';

// Text decodes out of scanner noise, left to right, like a readout locking on.
export function ScrambleText({ text, className, delay = 0, speed = 28 }: { text: string; className?: string; delay?: number; speed?: number }) {
  const reduce = useReducedMotion();
  const [output, setOutput] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (reduce || !inView) return;
    let frame = 0;
    let start: number | null = null;
    const total = text.length;
    const tick = (time: number) => {
      if (start === null) start = time + delay * 1000;
      const elapsed = time - start;
      if (elapsed < 0) {
        setOutput(text.replace(/\S/g, () => glyphs[Math.floor(Math.random() * glyphs.length)]!));
        frame = requestAnimationFrame(tick);
        return;
      }
      const resolved = Math.floor(elapsed / speed);
      let next = '';
      for (let index = 0; index < total; index += 1) {
        const char = text[index]!;
        if (index < resolved || char === ' ') next += char;
        else next += glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      setOutput(next);
      if (resolved < total) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [delay, inView, reduce, speed, text]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden>{output}</span>
    </span>
  );
}

// Headline words slide up from behind a mask, one after another.
export function SplitWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(' ');
  return (
    <span className={className} aria-label={text}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', rotate: 4 }}
            animate={{ y: '0%', rotate: 0 }}
            transition={{ duration: 1, ease: easeOutExpo, delay: delay + index * 0.07 }}
          >
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// Controls lean toward the pointer a little, then spring back.
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  return (
    <motion.div
      ref={ref}
      className={`inline-flex ${className ?? ''}`}
      style={{ x: springX, y: springY }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((event.clientX - rect.left - rect.width / 2) * strength);
        y.set((event.clientY - rect.top - rect.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

// Cards tilt in 3D under the pointer with a light sheen that tracks it.
export function Tilt({ children, className, max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 160, damping: 18 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 160, damping: 18 });
  const sheen = useTransform([px, py], ([xValue, yValue]) => `radial-gradient(420px circle at ${(xValue as number) * 100}% ${(yValue as number) * 100}%, hsl(var(--primary) / 0.10), transparent 45%)`);

  return (
    <motion.div
      ref={ref}
      className={`relative [transform-style:preserve-3d] ${className ?? ''}`}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        px.set((event.clientX - rect.left) / rect.width);
        py.set((event.clientY - rect.top) / rect.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: sheen }} />
    </motion.div>
  );
}
