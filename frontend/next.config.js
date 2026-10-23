/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: false,
  images: {
    // Standardize on WebP format to prevent generating duplicate AVIF + WebP permutations
    formats: ['image/webp'],
    // Cache transformed image assets at edge for 31 days (in seconds) to maximize edge cache hit ratio
    minimumCacheTTL: 2678400,
    // Streamlined device sizes matching responsive layouts (sm, md, lg, 2xl)
    // Eliminates redundant legacy mobile widths (750, 828, 1200, 2048, 3840)
    deviceSizes: [640, 768, 1080, 1920],
    // Focused image sizes for UI elements and icons
    imageSizes: [16, 32, 48, 64, 128, 256],
    // SVGs are vector graphics and should always be served statically via unoptimized.
    // Disallowing dangerous SVG transformation enforces this constraint across the codebase
    // and prevents accidental transformation burns on Vercel.
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Explicit remote patterns: no unauthorized remote hosts allowed to trigger transformations
    remotePatterns: [],
  },
  // Cache static public assets in browser and Vercel edge CDN for 30 days
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

