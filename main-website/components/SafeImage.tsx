import Image, { type ImageProps } from 'next/image';
import { canOptimise } from '@/lib/images';

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
  const resolved = src || fallbackSrc;
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

  return <Image src={resolved} alt={alt} {...props} />;
}

export default SafeImage;
