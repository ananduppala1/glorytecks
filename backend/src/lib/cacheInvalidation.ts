import { cacheDelete, cacheDeletePattern } from './cache';
import { logger } from '../config/logger';

/**
 * Map of resource names to their cache key patterns.
 * When a resource is mutated (create/update/delete), all matching patterns
 * are cleared so the next read fetches fresh data from MongoDB.
 */
const INVALIDATION_MAP: Record<string, string[]> = {
  // Bespoke resources
  blogs: [
    'public:blogs:*',
    'admin:dashboard:stats',
  ],
  courses: [
    'public:courses:*',
    'admin:dashboard:stats',
  ],
  settings: [
    'public:settings',
  ],
  about: [
    'public:about',
  ],

  // Generic resources (from the service registry)
  categories: ['public:categories:*', 'admin:dashboard:stats'],
  authors: ['public:authors:*'],
  trainers: ['public:trainers:*', 'admin:dashboard:stats'],
  testimonials: ['public:testimonials:*', 'admin:dashboard:stats'],
  placements: ['public:placements:*', 'admin:dashboard:stats'],
  companies: ['public:companies:*', 'admin:dashboard:stats'],
  roadmaps: ['public:roadmaps:*'],
  faqs: ['public:faqs:*'],
  comparisons: ['public:comparisons:*'],
  localities: ['public:localities:*'],
  legal: ['public:legal:*'],
  gallery: ['public:gallery:*', 'admin:dashboard:stats'],
  brochures: ['public:brochures:*', 'admin:dashboard:stats'],
  batches: ['public:batches:*'],

  // Lead-related: only affects dashboard stats
  'demo-requests': ['admin:dashboard:stats'],
  enquiries: ['admin:dashboard:stats'],
};

/**
 * Invalidate all cache entries related to a given resource.
 * Call this after any create, update, or delete operation.
 *
 * @param resource - The resource name (e.g. 'blogs', 'courses', 'trainers')
 */
export async function invalidateResource(resource: string): Promise<void> {
  const patterns = INVALIDATION_MAP[resource];
  if (!patterns || patterns.length === 0) return;

  logger.debug(`Cache invalidation: ${resource} → [${patterns.join(', ')}]`);

  await Promise.all(
    patterns.map((pattern) => {
      if (pattern.includes('*')) {
        return cacheDeletePattern(pattern);
      }
      return cacheDelete(pattern);
    }),
  );
}

/**
 * Invalidate dashboard stats cache directly (used by lead controllers).
 */
export async function invalidateDashboard(): Promise<void> {
  await cacheDelete('admin:dashboard:stats');
}
