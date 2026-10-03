import Image, { type ImageProps } from 'next/image';
import { canOptimise, cloudinaryLoader, isCloudinaryUrl } from '@/lib/images';
import { safeUrl } from '@/lib/safeUrl';

type SafeImageProps = Omit<ImageProps, 'src'> & {
  src: ImageProps['src'] | undefined | null;
  /** Rendered when `src` is empty. */
  fallbackSrc?: ImageProps['src'];
};

/**
 * next/image with a safety net.
 *
 * CMS-supplied image URLs (hero image, About sections, course banners, gallery)
 * are optimised when their host is in the configured allow-list, and fall back
 * to a plain <img> otherwise. Without this, an editor pasting a URL from an
 * unconfigured host would take the page down with a 500 instead of simply
 * serving an unoptimised image.
 *
 * Static imports and same-origin paths always take the optimised path.
 */
export function SafeImage({ src, fallbackSrc, alt, ...props }: SafeImageProps) {
  // A CMS-supplied `src` is a database string. If its scheme is not one we are
  // willing to put in an `img`, fall back rather than render it — otherwise the
  // unoptimised branch below becomes the way an unsafe URL reaches the DOM.
  const vetted = typeof src === 'string' ? safeUrl(src) : src;
  const resolved = vetted || fallbackSrc;
  if (!resolved) return null;

  if (typeof resolved === 'string' && !canOptimise(resolved)) {
    const {
      width,
      height,
      className,
      style,
      sizes,
      loading,
      priority,
      fetchPriority,
      decoding,
      ...rest
    } = props as ImageProps & { decoding?: 'async' | 'auto' | 'sync' };

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={alt}
        width={typeof width === 'number' ? width : undefined}
        height={typeof height === 'number' ? height : undefined}
        className={className}
        style={style}
        sizes={sizes}
        loading={priority ? 'eager' : (loading ?? 'lazy')}
        fetchPriority={priority ? 'high' : fetchPriority}
        decoding={decoding ?? 'async'}
        {...(rest as Record<string, unknown>)}
      />
    );
  }

  // Cloudinary already optimises and serves from its own CDN. Routing those
  // URLs through Vercel's optimizer pays twice and burns the Hobby plan's
  // monthly source-image quota, so they get Cloudinary's transformation
  // pipeline via a custom loader instead. See lib/images.ts.
  if (typeof resolved === 'string' && isCloudinaryUrl(resolved)) {
    return <Image src={resolved} alt={alt} loader={cloudinaryLoader} {...props} />;
  }

  return <Image src={resolved} alt={alt} {...props} />;
}

export default SafeImage;
