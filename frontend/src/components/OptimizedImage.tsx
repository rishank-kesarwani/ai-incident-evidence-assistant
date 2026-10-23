'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

export interface OptimizedImageProps extends Omit<ImageProps, 'onError'> {
  /**
   * Fallback image source to display if image transformation or loading fails.
   * Useful when Vercel image optimization transformation allowance has been exhausted.
   */
  fallbackSrc?: string;
  /**
   * Optional custom React fallback element rendered on error to preserve CLS.
   */
  fallbackElement?: React.ReactNode;
  /**
   * By default, vector SVGs and small thumbnails (<= 64px) automatically bypass
   * the Vercel Image Optimization loader to conserve monthly transformation allowances.
   * Set forceOptimize to true if you explicitly want Vercel transformation for this asset.
   */
  forceOptimize?: boolean;
}

/**
 * OptimizedImage
 * Enterprise wrapper around next/image that prevents unnecessary Vercel image transformations,
 * enforces sensible sizes, and provides fail-safe error handling when transformation allowances
 * are exhausted.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  sizes,
  unoptimized,
  forceOptimize = false,
  fallbackSrc,
  fallbackElement,
  className = '',
  style,
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  // Check if asset is an SVG or small icon (<= 64px) which should not hit Vercel's optimizer
  const isSvg = typeof src === 'string' && src.toLowerCase().split('?')[0].endsWith('.svg');
  const isSmallIcon =
    typeof width === 'number' && typeof height === 'number' && width <= 64 && height <= 64;

  const shouldBypassOptimization =
    unoptimized || (!forceOptimize && (isSvg || isSmallIcon));

  // Default responsive sizes to prevent downloading full-bleed variants on standard layouts
  const effectiveSizes =
    sizes ||
    (!shouldBypassOptimization && !width
      ? '(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 33vw'
      : undefined);

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    if (fallbackElement) {
      return (
        <div
          className={`image-fallback-container ${className}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: width ? `${width}px` : '100%',
            height: height ? `${height}px` : '100%',
            ...style,
          }}
          aria-label={alt}
          role="img"
        >
          {fallbackElement}
        </div>
      );
    }

    return (
      <div
        className={`image-fallback-placeholder ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 'var(--radius-sm, 6px)',
          border: '1px dashed var(--border-subtle, rgba(255, 255, 255, 0.15))',
          color: 'var(--text-dim, #64748b)',
          fontSize: '0.75rem',
          ...style,
        }}
        aria-label={alt}
        role="img"
      >
        <span>{alt || 'Asset'}</span>
      </div>
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      sizes={effectiveSizes}
      unoptimized={shouldBypassOptimization}
      className={className}
      style={style}
      onError={handleError}
      {...rest}
    />
  );
};

export default OptimizedImage;
