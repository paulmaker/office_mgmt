import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack is enabled by default in Next.js 16
  turbopack: {},
  devIndicators: false,
  
  // Increase body size limit for server actions if needed (though we use S3 for large files)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
          },
          // Content Security Policy
          // Note: We allow 'unsafe-eval' and 'unsafe-inline' for Next.js compatibility
          // We allow connections and images from AWS S3
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' blob: data: https://*.amazonaws.com https://*.s3.amazonaws.com;
              font-src 'self';
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              frame-ancestors 'none';
              connect-src 'self' https://*.amazonaws.com https://*.s3.amazonaws.com;
              upgrade-insecure-requests;
            `.replace(/\s{2,}/g, ' ').trim()
          }
        ]
      }
    ]
  }
};

export default nextConfig;
