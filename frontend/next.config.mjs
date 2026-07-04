/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    let apiOrigin = 'http://localhost:5000';

    try {
      apiOrigin = new URL(apiUrl).origin;
    } catch {
      apiOrigin = 'http://localhost:5000';
    }

    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser feature access
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js dev overlay / React Refresh needs unsafe-eval.
              // Keep production stricter by only allowing it outside prod.
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Allow blob: for PDF download and data: for images
              "img-src 'self' data: blob:",
              // Allow media blobs for certificate PDF streaming
              "media-src 'self' blob:",
              // API and WebSocket connections
              `connect-src 'self' ${apiOrigin} https://api.multihat.dev`,
              // PDF/cert downloads open in new tab
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
