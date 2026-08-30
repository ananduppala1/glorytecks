/** Application-wide constants and enums. */

export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor', // reserved for future use; system is role-extensible
  VIEWER: 'viewer',
  RECEPTIONIST: 'receptionist', // front-desk: enquiries + demo requests only
  CONTENT_WRITER: 'content_writer', // content team: blogs, courses, people & proof
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
export const ALL_ROLES: Role[] = [
  ROLES.ADMIN,
  ROLES.EDITOR,
  ROLES.VIEWER,
  ROLES.RECEPTIONIST,
  ROLES.CONTENT_WRITER,
];

export const CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;
export type ContentStatus = (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS];
export const ALL_CONTENT_STATUS: ContentStatus[] = [
  CONTENT_STATUS.DRAFT,
  CONTENT_STATUS.PUBLISHED,
  CONTENT_STATUS.ARCHIVED,
];

export const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  CONVERTED: 'converted',
  CLOSED: 'closed',
} as const;
export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];
export const ALL_LEAD_STATUS: LeadStatus[] = [
  LEAD_STATUS.NEW,
  LEAD_STATUS.CONTACTED,
  LEAD_STATUS.CONVERTED,
  LEAD_STATUS.CLOSED,
];

export const BLOG_KINDS = [
  'comparison',
  'roadmap',
  'salary',
  'interview',
  'projects',
  'certification',
  'whatis',
  'guide',
] as const;
export type BlogKind = (typeof BLOG_KINDS)[number];

export const BATCH_MODES = ['Online', 'Offline', 'Hybrid'] as const;
export type BatchMode = (typeof BATCH_MODES)[number];

export const COOKIE_NAMES = {
  REFRESH: 'gt_refresh_token',
} as const;

export const UPLOAD_LIMITS = {
  IMAGE_MAX_BYTES: 8 * 1024 * 1024, // 8MB
  DOC_MAX_BYTES: 20 * 1024 * 1024, // 20MB
};
