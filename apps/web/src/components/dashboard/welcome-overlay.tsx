'use client';

import { ArrowRight, Github, Linkedin, Phone } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Magnetic, ScrambleText, SplitWords, easeOutExpo } from '@/components/motion/primitives';
import { BrandMark } from './brand-mark';
import type { DashboardLocale } from './dashboard-copy';

const englishLines = [
  'Website QA Agent scans websites and organizes findings by page, severity, status, and technical area.',
  'It checks SEO titles, meta descriptions, headings, canonical tags, structured data, accessibility signals, responsive behavior, frontend structure, runtime errors, failed resources, network/API responses, security headers, cookies, consent signals, performance metrics, resource sizes, and crawl coverage.',
  'While a scan is running, the dashboard shows live progress, scanned pages, queued URLs, failed pages, blocked/skipped URLs, downloads, API endpoints, feature checks, logs, and navigation steps.',
  'After completion, the results workspace lets you filter by issue type, page, severity, and status, then update issue state and review evidence in a clean workflow.'
];

const arabicLines = [
  'Website QA Agent يفحص المواقع وينظم النتائج حسب الصفحة والخطورة والحالة والمجال التقني.',
  'يفحص عناوين SEO، أوصاف meta، العناوين الرئيسية، canonical، البيانات المنظمة، الوصول، تجاوب الشاشات، بنية الواجهة، أخطاء التشغيل، الموارد الفاشلة، الشبكة وواجهات API، ترويسات الأمان، الكوكيز، الموافقات، الأداء، أحجام الموارد، وتغطية الزحف.',
  'أثناء تشغيل الفحص يعرض التقدم المباشر، الصفحات المفحوصة، الروابط المنتظرة، الصفحات الفاشلة، الروابط المحجوبة أو المتخطاة، التحميلات، نقاط API، فحوصات الميزات، السجلات، وخطوات التنقل.',
  'بعد الانتهاء يمكنك فلترة النتائج حسب نوع المشكلة، الصفحة، الخطورة، والحالة، ثم تحديث حالة المشكلة ومراجعة الأدلة ضمن واجهة منظمة.'
];

function round(value: number) {
  return Math.round(value * 100) / 100;
}

const capabilities = ['SEO', 'Accessibility', 'Performance', 'Frontend', 'Network/API', 'Security'];

// The first visit opens on a boot sequence: a beam splits the dark screen open, the scope draws
// itself, each area the scanner covers lights up around it, and the introduction types itself out.
// It is shown once; the choice is remembered in this browser.
export function WelcomeOverlay({ locale }: { locale: DashboardLocale }) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const terminalRef = useRef<HTMLPreElement>(null);
  const lines = useMemo(() => (locale === 'ar' ? arabicLines : englishLines), [locale]);
  const fullText = lines.join('\n\n');

  useEffect(() => {
    const dismissed = window.localStorage.getItem('sitescope-intro-dismissed');
    setIsOpen(dismissed !== 'true');
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setText(fullText);
      return;
    }
    let index = 0;
    let timer = 0;
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        index += 2;
        setText(fullText.slice(0, index));
        if (index >= fullText.length) {
          window.clearInterval(timer);
        }
      }, 16);
    }, 1500);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [fullText, isOpen]);

  // Keep the newest typed line in view.
  useEffect(() => {
    const terminal = terminalRef.current;
    if (terminal) terminal.scrollTop = terminal.scrollHeight;
  }, [text]);

  useEffect(() => {
    if (!isOpen) return;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const close = () => {
    window.localStorage.setItem('sitescope-intro-dismissed', 'true');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="welcome"
          role="dialog"
          aria-modal="true"
          aria-label="Website QA Agent"
          className="fixed inset-0 z-50 overflow-y-auto bg-background"
          exit={{ clipPath: 'inset(50% 0% 50% 0%)', transition: { duration: 0.9, ease: [0.83, 0, 0.17, 1] } }}
          style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          data-lenis-prevent
        >
          {/* Opening beam: a line of light that splits the screen open. */}
          <motion.div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-1/2 z-20 h-px bg-primary shadow-[0_0_30px_4px_hsl(var(--primary))]"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
            transition={{ duration: 1.3, times: [0, 0.5, 1], ease: easeOutExpo }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 z-10 h-1/2 bg-background"
            initial={{ y: 0 }}
            animate={{ y: '-100%' }}
            transition={{ duration: 1.1, delay: 0.55, ease: [0.83, 0, 0.17, 1] }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-1/2 bg-background"
            initial={{ y: 0 }}
            animate={{ y: '100%' }}
            transition={{ duration: 1.1, delay: 0.55, ease: [0.83, 0, 0.17, 1] }}
          />

          <div aria-hidden className="pointer-events-none fixed inset-0 bg-[linear-gradient(hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
          <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_60%_at_25%_45%,hsl(var(--primary)/0.12),transparent_60%)]" />

          <div className="relative mx-auto grid min-h-full max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:px-10">
            <div className="relative order-2 mx-auto w-full max-w-[520px] lg:order-1">
              <IntroScope />
            </div>

            <div className="order-1 min-w-0 lg:order-2">
              <motion.div className="flex items-center gap-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.8, ease: easeOutExpo }}>
                <BrandMark size={40} />
                <ScrambleText text="WEBSITE QA AGENT" className="font-mono text-xs font-medium tracking-[0.3em] text-primary" delay={1.1} />
              </motion.div>

              <h1 className="display mt-6 text-5xl leading-[0.95] sm:text-6xl xl:text-7xl">
                <SplitWords text={locale === 'ar' ? 'لوحة فحص جودة المواقع' : 'Website Quality Console'} delay={1.25} />
              </h1>

              <motion.p
                className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground"
                initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 1.6, duration: 0.9, ease: easeOutExpo }}
              >
                {locale === 'ar'
                  ? 'واجهة عملية لفحص جودة المواقع، متابعة التقدم، وتنظيم النتائج الفنية بشكل واضح.'
                  : 'A practical console for website quality scanning, progress tracking, and organized technical review.'}
              </motion.p>

              <motion.div
                className="mt-6 overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.45, duration: 0.8, ease: easeOutExpo }}
              >
                <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sev-critical/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-sev-medium/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
                  <span className="ms-2 font-mono text-[10.5px] text-muted-foreground">qa-agent --about</span>
                </div>
                <pre ref={terminalRef} className="h-56 overflow-auto whitespace-pre-wrap break-words p-4 font-sans text-sm leading-7 text-muted-foreground sm:h-64">
                  {text}
                  <span className="animate-caret text-primary">▌</span>
                </pre>
              </motion.div>

              <motion.div
                className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.8, ease: easeOutExpo }}
              >
                <div>
                  <div className="eyebrow">{locale === 'ar' ? 'تم التطوير بواسطة' : 'Built by'}</div>
                  <div className="mt-1 text-lg font-semibold">{locale === 'ar' ? 'أنس الدهامشة' : 'Anas Al-Dahamsheh'}</div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[11px] text-muted-foreground" dir="ltr">
                    <a className="inline-flex items-center gap-1.5 transition-colors hover:text-primary" href="tel:+962789495167">
                      <Phone className="h-3.5 w-3.5" />
                      +962789495167
                    </a>
                    <a className="inline-flex items-center gap-1.5 transition-colors hover:text-primary" href="https://github.com/anas-aldahamsheh" target="_blank" rel="noopener noreferrer">
                      <Github className="h-3.5 w-3.5" />
                      github.com/anas-aldahamsheh
                    </a>
                    <a className="inline-flex items-center gap-1.5 transition-colors hover:text-primary" href="https://www.linkedin.com/in/anas-aldahamsheh" target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-3.5 w-3.5" />
                      linkedin.com/in/anas-aldahamsheh
                    </a>
                  </div>
                </div>
                <Magnetic strength={0.25}>
                  <button type="button" onClick={close} className="btn-primary group h-14 whitespace-nowrap px-7 text-base">
                    {locale === 'ar' ? 'الدخول إلى التطبيق' : 'Open the app'}
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </button>
                </Magnetic>
              </motion.div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// A large scope that draws its rings, then lights each capability on its orbit in turn.
function IntroScope() {
  return (
    <div className="relative aspect-square w-full" aria-hidden>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full overflow-visible">
        {[180, 140, 100, 60].map((radius, index) => (
          <motion.circle
            key={radius}
            cx="200"
            cy="200"
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.9 + index * 0.12, ease: easeOutExpo }}
          />
        ))}
        <motion.circle
          cx="200"
          cy="200"
          r="180"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeDasharray="4 10"
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 0.6, rotate: 360 }}
          transition={{ opacity: { delay: 1.4, duration: 1 }, rotate: { duration: 60, repeat: Infinity, ease: 'linear' } }}
          style={{ originX: '200px', originY: '200px' }}
        />
        {Array.from({ length: 72 }, (_, index) => {
          const angle = (index * 5 * Math.PI) / 180;
          const inner = index % 6 === 0 ? 186 : 191;
          return (
            <motion.line
              key={index}
              x1={round(200 + Math.cos(angle) * inner)}
              y1={round(200 + Math.sin(angle) * inner)}
              x2={round(200 + Math.cos(angle) * 196)}
              y2={round(200 + Math.sin(angle) * 196)}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1 + index * 0.008 }}
            />
          );
        })}
        {capabilities.map((label, index) => {
          const angle = (index / capabilities.length) * Math.PI * 2 - Math.PI / 2;
          const x = round(200 + Math.cos(angle) * 140);
          const y = round(200 + Math.sin(angle) * 140);
          const delay = 1.8 + index * 0.28;
          return (
            <g key={label}>
              <motion.line x1="200" y1="200" x2={x} y2={y} stroke="hsl(var(--primary))" strokeWidth="1" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.35 }} transition={{ delay, duration: 0.6, ease: easeOutExpo }} />
              <motion.circle cx={x} cy={y} r="14" fill="hsl(var(--primary))" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 2.2, 1], opacity: [0, 0.35, 0.12] }} transition={{ delay: delay + 0.4, duration: 0.9 }} style={{ originX: `${x}px`, originY: `${y}px` }} />
              <motion.circle cx={x} cy={y} r="5" fill="hsl(var(--primary))" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: delay + 0.4, type: 'spring', stiffness: 400, damping: 12 }} style={{ originX: `${x}px`, originY: `${y}px` }} />
              <motion.text
                x={x}
                y={y + (y > 200 ? 32 : -22)}
                textAnchor="middle"
                className="fill-foreground font-mono text-[11px] uppercase tracking-[0.15em]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.5, duration: 0.6, ease: easeOutExpo }}
              >
                {label}
              </motion.text>
            </g>
          );
        })}
      </svg>
      <motion.div
        className="absolute inset-[5%] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_280deg,hsl(var(--primary)/0.05)_290deg,hsl(var(--primary)/0.4)_360deg)] [animation:sweep_4s_linear_infinite]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 1 }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 flex items-center justify-center"
        style={{ x: '-50%', y: '-50%' }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: 'spring', stiffness: 200, damping: 14 }}
      >
        <BrandMark size={84} />
      </motion.div>
    </div>
  );
}
