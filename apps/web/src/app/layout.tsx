import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import './globals.css';
import { MotionProvider } from '@/components/motion/motion-provider';

export const metadata: Metadata = {
  title: 'Website QA Agent — Website Quality Console',
  description: 'An autonomous website quality console for scanning pages, tracking issues, and reviewing site health reports.',
};

export const viewport: Viewport = {
  themeColor: '#07090d',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
try {
  var storedTheme = window.localStorage.getItem('sitescope-theme') || window.localStorage.getItem('sentinelqa-theme');
  if (storedTheme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
  if (new URLSearchParams(window.location.search).get('locale') === 'ar') {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }
} catch (_) {}
`
          }}
        />
      </head>
      <body className="grain min-h-screen bg-background text-foreground antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
