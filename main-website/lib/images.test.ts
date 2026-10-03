import { describe, expect, it } from 'vitest';
import { cloudinaryLoader, isCloudinaryUrl, canOptimise } from '@/lib/images';

describe('cloudinaryLoader', () => {
  const base = 'https://res.cloudinary.com/demo/image/upload/v1699/course.jpg';

  it('injects format, quality, limit and the requested width', () => {
    expect(cloudinaryLoader({ src: base, width: 1200 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_1200/v1699/course.jpg',
    );
  });

  it('honours an explicit quality', () => {
    expect(cloudinaryLoader({ src: base, width: 640, quality: 70 })).toContain('q_70');
  });

  it('never upscales past the source', () => {
    expect(cloudinaryLoader({ src: base, width: 320 })).toContain('c_limit');
  });

  it('leaves an editor-supplied transformation alone', () => {
    // Overriding a deliberate crop would change what the editor chose to show.
    const cropped = 'https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,w_400/v1/a.jpg';
    expect(cloudinaryLoader({ src: cropped, width: 800 })).toBe(cropped);
  });

  it('passes through anything that is not a Cloudinary delivery URL', () => {
    for (const src of [
      '/local/hero.webp',
      'https://images.example.com/a.jpg',
      'https://res.cloudinary.com/demo/raw/thing.pdf',
    ]) {
      expect(cloudinaryLoader({ src, width: 800 })).toBe(src);
    }
  });
});

describe('isCloudinaryUrl', () => {
  it('matches only Cloudinary delivery URLs', () => {
    expect(isCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg')).toBe(true);
    expect(isCloudinaryUrl('https://res.cloudinary.com/demo/image/fetch/a.jpg')).toBe(false);
    expect(isCloudinaryUrl('https://evil.test/res.cloudinary.com/upload/a.jpg')).toBe(false);
    expect(isCloudinaryUrl('/logo.png')).toBe(false);
  });
});

describe('canOptimise', () => {
  it('still refuses unsafe schemes', () => {
    expect(canOptimise('javascript:alert(1)')).toBe(false);
    expect(canOptimise('//evil.test/a.jpg')).toBe(false);
    expect(canOptimise(undefined)).toBe(false);
  });

  it('allows same-origin paths and Cloudinary', () => {
    expect(canOptimise('/logo.png')).toBe(true);
    expect(canOptimise('https://res.cloudinary.com/demo/image/upload/v1/a.jpg')).toBe(true);
  });
});
