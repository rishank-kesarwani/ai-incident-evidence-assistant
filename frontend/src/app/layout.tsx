import type { Metadata } from 'next';
import '../styles/globals.css';
import { AuthProvider } from '../lib/auth-context';
import NavigationBar from '../components/NavigationBar';

export const metadata: Metadata = {
  title: 'AI Incident Evidence & Runbook Assistant',
  description:
    'AI-assisted incident investigation platform correlating sanitized logs, traces, deployment events, and runbooks into evidence-linked timelines and operator-approved remediation plans.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <AuthProvider>
          <div className="app-container">
            <NavigationBar />
            <main className="main-content">{children}</main>
            <footer
              style={{
                borderTop: '1px solid var(--border-subtle)',
                padding: '24px 32px',
                textAlign: 'center',
                fontSize: '0.8rem',
                color: 'var(--text-dim)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  maxWidth: '1440px',
                  margin: '0 auto',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <strong>AI Incident Evidence &amp; Runbook Assistant</strong> • Enterprise SRE Console
                </div>
                <div>
                  Recommendation-only safety boundary • Redacted evidence • Operator-gated remediation
                </div>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
