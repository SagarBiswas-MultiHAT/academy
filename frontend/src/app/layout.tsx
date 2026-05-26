import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'MultiHAT Academy', template: '%s | MultiHAT Academy' },
  description: 'Premium technical e-books with verifiable certificates. Master Google Dorks, OSINT, and cybersecurity.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://academy.multihat.dev'),
  openGraph: {
    siteName: 'MultiHAT Academy',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'MultiHAT Academy' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
