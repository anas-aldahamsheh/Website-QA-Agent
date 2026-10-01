import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Website QA Agent — Website Quality Console',
  description: 'An autonomous website quality console for scanning pages, tracking issues, and reviewing site health reports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
} catch (_) {}
`
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
