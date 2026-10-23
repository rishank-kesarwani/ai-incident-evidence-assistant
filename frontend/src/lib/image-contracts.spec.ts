import fs from 'fs';
import path from 'path';

describe('Vercel Image Optimization Guardrails & Asset Contracts', () => {
  // Load next.config.js for contract assertions
  const nextConfig = require('../../next.config.js');

  it('validates next.config.js image optimization guardrail contracts', () => {
    expect(nextConfig.images).toBeDefined();

    // Standardized to single modern WebP format (avoids duplicate AVIF/WebP variants)
    expect(nextConfig.images.formats).toEqual(['image/webp']);

    // Minimum edge cache TTL configured to 31 days (2,678,400s) to maximize hit ratios and eliminate 60s revalidation
    expect(nextConfig.images.minimumCacheTTL).toBe(2678400);

    // deviceSizes trimmed to eliminate redundant legacy mobile widths (750, 828, 1200, 2048, 3840)
    expect(nextConfig.images.deviceSizes).toEqual([640, 768, 1080, 1920]);

    // imageSizes tailored for UI icons and project cards
    expect(nextConfig.images.imageSizes).toEqual([16, 32, 48, 64, 128, 256]);

    // SVGs must never be transformed via Vercel optimizer
    expect(nextConfig.images.dangerouslyAllowSVG).toBe(false);

    // No unauthorized remote image domains
    expect(nextConfig.images.remotePatterns).toEqual([]);
  });

  it('validates static asset edge cache headers in nextConfig.headers', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    const headersConfig = await nextConfig.headers();
    expect(Array.isArray(headersConfig)).toBe(true);

    const staticMediaHeader = headersConfig.find((h: any) =>
      h.source.includes('webp') || h.source.includes('svg')
    );
    expect(staticMediaHeader).toBeDefined();

    const cacheControl = staticMediaHeader.headers.find(
      (h: any) => h.key === 'Cache-Control'
    );
    expect(cacheControl).toBeDefined();
    expect(cacheControl.value).toContain('max-age=2592000');
    expect(cacheControl.value).toContain('stale-while-revalidate=86400');
  });

  it('verifies essential pre-optimized static assets exist in public directory', () => {
    const publicDir = path.resolve(__dirname, '../../public');
    const requiredFiles = [
      'favicon.ico',
      'favicon.svg',
      'icon.svg',
      'logo.webp',
      'logo.png',
      'site.webmanifest',
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(publicDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(0);
    }
  });
});
