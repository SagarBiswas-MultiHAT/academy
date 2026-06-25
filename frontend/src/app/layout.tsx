import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: { default: 'MultiHAT Academy', template: '%s | MultiHAT Academy' },
  description: 'Premium e-books with verifiable certificates. Cybersecurity, programming, agriculture, and more.',
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
      <body className={`${manrope.className} ${spaceGrotesk.variable}`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
