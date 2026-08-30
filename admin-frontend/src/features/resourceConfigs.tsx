import {
  FolderTree,
  PenLine,
  Users,
  Quote,
  Trophy,
  Building2,
  Route,
  HelpCircle,
  GitCompareArrows,
  MapPin,
  Scale,
  Images,
  FileDown,
  CalendarClock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { truncate } from '@/lib/utils';
import type { ResourceConfig } from '@/features/formTypes';
import type {
  BlogCategory,
  Author,
  Trainer,
  Testimonial,
  Placement,
  Company,
  Roadmap,
  Faq,
  Comparison,
  Locality,
  LegalDoc,
  GalleryItem,
  Brochure,
  Batch,
} from '@/types';

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
];

function activeCell(active: boolean) {
  return active ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Hidden</Badge>;
}

export const categoryConfig: ResourceConfig<BlogCategory> = {
  key: 'categories',
  endpoint: '/categories',
  singular: 'Category',
  plural: 'Categories',
  description: 'Topic categories that organise blog content and map to courses.',
  icon: FolderTree,
  defaultSort: 'order',
  defaultOrder: 'asc',
  dialogWide: true,
  columns: [
    { key: 'name', header: 'Name', sortable: true, render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'slug', header: 'Slug', render: (c) => <span className="font-mono text-xs text-muted-foreground">{c.slug}</span> },
    { key: 'courseTitle', header: 'Linked course', render: (c) => c.courseTitle || '—' },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, colSpan: 1 },
    { name: 'slug', label: 'Slug', type: 'slug', slugFrom: 'name', colSpan: 1 },
    { name: 'short', label: 'Short label', type: 'text', colSpan: 1 },
    { name: 'icon', label: 'Icon (lucide name)', type: 'text', colSpan: 1, placeholder: 'e.g. Brain' },
    { name: 'color', label: 'Accent colour', type: 'color', colSpan: 1 },
    { name: 'courseSlug', label: 'Course slug', type: 'text', colSpan: 1 },
    { name: 'courseTitle', label: 'Course title', type: 'text', colSpan: 1 },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'blurb', label: 'Blurb', type: 'textarea' },
    { name: 'tools', label: 'Tools', type: 'tags', colSpan: 1 },
    { name: 'roles', label: 'Roles', type: 'tags', colSpan: 1 },
    { name: 'skills', label: 'Skills', type: 'tags', colSpan: 1 },
    { name: 'certifications', label: 'Certifications', type: 'tags', colSpan: 1 },
    { name: 'prerequisites', label: 'Prerequisites', type: 'tags' },
    { name: 'salary', label: 'Salary bands', type: 'salary' },
    { name: 'order', label: 'Sort order', type: 'number', colSpan: 1 },
  ],
};

export const authorConfig: ResourceConfig<Author> = {
  key: 'authors',
  endpoint: '/authors',
  singular: 'Author',
  plural: 'Authors',
  description: 'Bylines shown on blog posts.',
  icon: PenLine,
  defaultSort: 'name',
  defaultOrder: 'asc',
  columns: [
    { key: 'name', header: 'Name', sortable: true, render: (a) => <span className="font-medium">{a.name}</span> },
    { key: 'role', header: 'Role', render: (a) => a.role || '—' },
    { key: 'key', header: 'Key', render: (a) => <span className="font-mono text-xs text-muted-foreground">{a.key}</span> },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, colSpan: 1 },
    { name: 'key', label: 'Key', type: 'slug', slugFrom: 'name', colSpan: 1, hint: 'Stable identifier used in posts' },
    { name: 'role', label: 'Role / title', type: 'text', colSpan: 1 },
    { name: 'initials', label: 'Initials', type: 'text', colSpan: 1 },
    { name: 'avatar', label: 'Avatar', type: 'image', uploadFolder: 'authors' },
    { name: 'bio', label: 'Bio', type: 'textarea' },
  ],
};

export const trainerConfig: ResourceConfig<Trainer> = {
  key: 'trainers',
  endpoint: '/trainers',
  singular: 'Trainer',
  plural: 'Trainers',
  description: 'Instructors featured across the site.',
  icon: Users,
  defaultSort: 'order',
  defaultOrder: 'asc',
  columns: [
    { key: 'name', header: 'Name', sortable: true, render: (t) => <span className="font-medium">{t.name}</span> },
    { key: 'title', header: 'Title', render: (t) => t.title || '—' },
    { key: 'company', header: 'Background', render: (t) => t.company || '—' },
    { key: 'isActive', header: 'Status', render: (t) => activeCell(t.isActive) },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, colSpan: 1 },
    { name: 'title', label: 'Title', type: 'text', colSpan: 1 },
    { name: 'company', label: 'Background (e.g. Ex-Amazon)', type: 'text', colSpan: 1 },
    { name: 'experience', label: 'Experience', type: 'text', colSpan: 1, placeholder: '12 Years' },
    { name: 'avatar', label: 'Photo', type: 'image', uploadFolder: 'trainers' },
    { name: 'skills', label: 'Skills', type: 'tags' },
    { name: 'bio', label: 'Bio', type: 'textarea' },
    { name: 'linkedin', label: 'LinkedIn URL', type: 'url', colSpan: 1 },
    { name: 'order', label: 'Sort order', type: 'number', colSpan: 1 },
    { name: 'featured', label: 'Featured', type: 'switch', colSpan: 1 },
    { name: 'isActive', label: 'Active', type: 'switch', colSpan: 1, defaultValue: true },
  ],
};

export const testimonialConfig: ResourceConfig<Testimonial> = {
  key: 'testimonials',
  endpoint: '/testimonials',
  singular: 'Testimonial',
  plural: 'Testimonials',
  description: 'Student success quotes.',
  icon: Quote,
  defaultSort: 'order',
  defaultOrder: 'asc',
  columns: [
    { key: 'name', header: 'Student', sortable: true, render: (t) => <span className="font-medium">{t.name}</span> },
    { key: 'role', header: 'Outcome', render: (t) => t.role || '—' },
    { key: 'quote', header: 'Quote', render: (t) => <span className="text-muted-foreground">{truncate(t.quote, 60)}</span> },
    { key: 'isActive', header: 'Status', render: (t) => activeCell(t.isActive) },
  ],
  fields: [
    { name: 'name', label: 'Student name', type: 'text', required: true, colSpan: 1 },
    { name: 'role', label: 'Role / outcome', type: 'text', colSpan: 1, placeholder: 'Data Scientist @ MNC' },
    { name: 'course', label: 'Course', type: 'text', colSpan: 1 },
    { name: 'salary', label: 'Package', type: 'text', colSpan: 1, placeholder: '₹18 LPA' },
    { name: 'stars', label: 'Stars (1–5)', type: 'number', colSpan: 1, defaultValue: 5 },
    { name: 'avatar', label: 'Photo', type: 'image', uploadFolder: 'testimonials', colSpan: 1 },
    { name: 'quote', label: 'Quote', type: 'textarea', required: true },
    { name: 'order', label: 'Sort order', type: 'number', colSpan: 1 },
    { name: 'featured', label: 'Featured', type: 'switch', colSpan: 1 },
    { name: 'isActive', label: 'Active', type: 'switch', colSpan: 1, defaultValue: true },
  ],
};

export const placementConfig: ResourceConfig<Placement> = {
  key: 'placements',
  endpoint: '/placements',
  singular: 'Placement',
  plural: 'Placements',
  description: 'Placement / success stories with package details.',
  icon: Trophy,
  defaultSort: 'order',
  defaultOrder: 'asc',
  columns: [
    { key: 'name', header: 'Student', sortable: true, render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'company', header: 'Company', render: (p) => p.company || '—' },
    { key: 'packageLpa', header: 'Package', render: (p) => <span className="tabular">{p.packageLpa || '—'}</span> },
    { key: 'course', header: 'Course', render: (p) => p.course || '—' },
    { key: 'isActive', header: 'Status', render: (p) => activeCell(p.isActive) },
  ],
  fields: [
    { name: 'name', label: 'Student name', type: 'text', required: true, colSpan: 1 },
    { name: 'role', label: 'Role', type: 'text', colSpan: 1 },
    { name: 'company', label: 'Company', type: 'text', colSpan: 1 },
    { name: 'course', label: 'Course', type: 'text', colSpan: 1 },
    { name: 'packageLpa', label: 'New package', type: 'text', colSpan: 1, placeholder: '18 LPA' },
    { name: 'previousPackage', label: 'Previous package', type: 'text', colSpan: 1, placeholder: '3.5 LPA' },
    { name: 'stars', label: 'Stars (1–5)', type: 'number', colSpan: 1, defaultValue: 5 },
    { name: 'avatar', label: 'Photo', type: 'image', uploadFolder: 'placements', colSpan: 1 },
    { name: 'order', label: 'Sort order', type: 'number', colSpan: 1 },
    { name: 'featured', label: 'Featured', type: 'switch', colSpan: 1 },
    { name: 'isActive', label: 'Active', type: 'switch', colSpan: 1, defaultValue: true },
  ],
};

export const companyConfig: ResourceConfig<Company> = {
  key: 'companies',
  endpoint: '/companies',
  singular: 'Hiring Partner',
  plural: 'Hiring Partners',
  description: 'Companies where students have been placed.',
  icon: Building2,
  defaultSort: 'order',
  defaultOrder: 'asc',
  columns: [
    { key: 'name', header: 'Company', sortable: true, render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'website', header: 'Website', render: (c) => c.website || '—' },
    { key: 'isActive', header: 'Status', render: (c) => activeCell(c.isActive) },
  ],
  fields: [
    { name: 'name', label: 'Company name', type: 'text', required: true, colSpan: 1 },
    { name: 'website', label: 'Website', type: 'url', colSpan: 1 },
    { name: 'logo', label: 'Logo', type: 'image', uploadFolder: 'companies' },
    { name: 'order', label: 'Sort order', type: 'number', colSpan: 1 },
    { name: 'isActive', label: 'Active', type: 'switch', colSpan: 1, defaultValue: true },
  ],
};

export const roadmapConfig: ResourceConfig<Roadmap> = {
  key: 'roadmaps',
  endpoint: '/roadmaps',
  singular: 'Roadmap',
  plural: 'Roadmaps',
  description: 'Step-by-step learning paths shown on the homepage.',
  icon: Route,
  defaultSort: 'order',
  defaultOrder: 'asc',
  columns: [
    { key: 'course', header: 'Course', sortable: true, render: (r) => <span className="font-medium">{r.course}</span> },
    { key: 'steps', header: 'Steps', render: (r) => <span className="text-muted-foreground">{r.steps?.length ?? 0} steps</span> },
    { key: 'isActive', header: 'Status', render: (r) => activeCell(r.isActive) },
  ],
  fields: [
    { name: 'course', label: 'Course name', type: 'text', required: true, colSpan: 1 },
    { name: 'color', label: 'Gradient classes', type: 'text', colSpan: 1, placeholder: 'from-blue-500/20 to-blue-600/5' },
    { name: 'steps', label: 'Steps', type: 'tags', hint: 'Add each step in order' },
    { name: 'order', label: 'Sort order', type: 'number', colSpan: 1 },
    { name: 'isActive', label: 'Active', type: 'switch', colSpan: 1, defaultValue: true },
  ],
};

export const faqConfig: ResourceConfig<Faq> = {
  key: 'faqs',
  endpoint: '/faqs',
  singular: 'FAQ',
  plural: 'FAQs',
  description: 'Frequently asked questions.',
  icon: HelpCircle,
  defaultSort: 'order',
  defaultOrder: 'asc',
  columns: [
    { key: 'question', header: 'Question', sortable: true, render: (f) => <span className="font-medium">{truncate(f.question, 70)}</span> },
    { key: 'scope', header: 'Scope', render: (f) => <Badge variant="outline">{f.scope || 'general'}</Badge> },
    { key: 'isActive', header: 'Status', render: (f) => activeCell(f.isActive) },
  ],
  fields: [
    { name: 'question', label: 'Question', type: 'text', required: true },
    { name: 'answer', label: 'Answer', type: 'textarea', required: true },
    { name: 'scope', label: 'Scope', type: 'text', colSpan: 1, placeholder: 'general', defaultValue: 'general' },
    { name: 'order', label: 'Sort order', type: 'number', colSpan: 1 },
    { name: 'isActive', label: 'Active', type: 'switch', colSpan: 1, defaultValue: true },
  ],
};

export const comparisonConfig: ResourceConfig<Comparison> = {
  key: 'comparisons',
  endpoint: '/comparisons',
  singular: 'Comparison',
  plural: 'Comparisons',
  description: 'Side-by-side "X vs Y" comparison pages.',
  icon: GitCompareArrows,
  defaultSort: 'order',
  defaultOrder: 'asc',
  dialogWide: true,
  columns: [
    { key: 'title', header: 'Title', sortable: true, render: (c) => <span className="font-medium">{c.title}</span> },
    { key: 'slug', header: 'Slug', render: (c) => <span className="font-mono text-xs text-muted-foreground">{c.slug}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'slug', label: 'Slug', type: 'slug', slugFrom: 'title', colSpan: 1 },
    { name: 'metaTitle', label: 'Meta title', type: 'text', colSpan: 1 },
    { name: 'itemA', label: 'Item A', type: 'text', colSpan: 1 },
    { name: 'itemB', label: 'Item B', type: 'text', colSpan: 1 },
    { name: 'intro', label: 'Intro', type: 'textarea' },
    {
      name: 'rows',
      label: 'Comparison rows',
      type: 'objectlist',
      subFields: [
        { name: 'factor', label: 'Aspect' },
        { name: 'a', label: 'Item A' },
        { name: 'b', label: 'Item B' },
      ],
    },
    { name: 'verdict', label: 'Verdict', type: 'textarea' },
    { name: 'relatedCourses', label: 'Related course slugs', type: 'tags' },
    {
      name: 'faqs',
      label: 'FAQs',
      type: 'objectlist',
      subFields: [
        { name: 'q', label: 'Question' },
        { name: 'a', label: 'Answer', type: 'textarea' },
      ],
    },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, colSpan: 1, defaultValue: 'published' },
    { name: 'order', label: 'Sort order', type: 'number', colSpan: 1 },
  ],
};

export const localityConfig: ResourceConfig<Locality> = {
  key: 'localities',
  endpoint: '/localities',
  singular: 'Locality',
  plural: 'Localities',
  description: 'Location landing pages for local SEO.',
  icon: MapPin,
  defaultSort: 'order',
  defaultOrder: 'asc',
  columns: [
    { key: 'name', header: 'Locality', sortable: true, render: (l) => <span className="font-medium">{l.name}</span> },
    { key: 'slug', header: 'Slug', render: (l) => <span className="font-mono text-xs text-muted-foreground">{l.slug}</span> },
    { key: 'region', header: 'Region', render: (l) => l.region || '—' },
    { key: 'isActive', header: 'Status', render: (l) => activeCell(l.isActive) },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, colSpan: 1 },
    { name: 'slug', label: 'Slug', type: 'slug', slugFrom: 'name', colSpan: 1 },
    { name: 'region', label: 'Region / city', type: 'text', colSpan: 1, placeholder: 'Hyderabad' },
    { name: 'intro', label: 'Intro', type: 'textarea' },
    { name: 'landmarks', label: 'Landmarks', type: 'tags' },
    { name: 'order', label: 'Sort order', type: 'number', colSpan: 1 },
    { name: 'isActive', label: 'Active', type: 'switch', colSpan: 1, defaultValue: true },
  ],
};

export const legalConfig: ResourceConfig<LegalDoc> = {
  key: 'legal',
  endpoint: '/legal',
  singular: 'Legal Page',
  plural: 'Legal Pages',
  description: 'Policy and legal documents (privacy, terms, refund).',
  icon: Scale,
  defaultSort: 'title',
  defaultOrder: 'asc',
  dialogWide: true,
  columns: [
    { key: 'title', header: 'Title', sortable: true, render: (d) => <span className="font-medium">{d.title}</span> },
    { key: 'slug', header: 'Slug', render: (d) => <span className="font-mono text-xs text-muted-foreground">{d.slug}</span> },
    { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 1 },
    { name: 'slug', label: 'Slug', type: 'slug', slugFrom: 'title', colSpan: 1 },
    { name: 'updatedLabel', label: 'Last updated label', type: 'text', colSpan: 1, placeholder: 'January 2026' },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, colSpan: 1, defaultValue: 'published' },
    { name: 'body', label: 'Body (HTML or Markdown)', type: 'richtext' },
  ],
};

export const galleryConfig: ResourceConfig<GalleryItem> = {
  key: 'gallery',
  endpoint: '/gallery',
  singular: 'Gallery Image',
  plural: 'Gallery',
  description: 'Campus and event photos.',
  icon: Images,
  defaultSort: 'order',
  defaultOrder: 'asc',
  columns: [
    {
      key: 'imageUrl',
      header: 'Image',
      render: (g) =>
        g.imageUrl ? (
          <img src={g.imageUrl} alt={g.title ?? ''} className="h-10 w-16 rounded object-cover" />
        ) : (
          '—'
        ),
    },
    { key: 'title', header: 'Title', render: (g) => g.title || '—' },
    { key: 'category', header: 'Category', render: (g) => g.category || '—' },
    { key: 'isActive', header: 'Status', render: (g) => activeCell(g.isActive) },
  ],
  fields: [
    { name: 'title', label: 'Title', type: 'text', colSpan: 1 },
    { name: 'category', label: 'Category', type: 'text', colSpan: 1 },
    { name: 'imageUrl', label: 'Image', type: 'image', required: true, uploadFolder: 'gallery' },
    { name: 'order', label: 'Sort order', type: 'number', colSpan: 1 },
    { name: 'isActive', label: 'Active', type: 'switch', colSpan: 1, defaultValue: true },
  ],
};

export const brochureConfig: ResourceConfig<Brochure> = {
  key: 'brochures',
  endpoint: '/brochures',
  singular: 'Brochure',
  plural: 'Brochures',
  description: 'Downloadable course brochures (PDF).',
  icon: FileDown,
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  columns: [
    { key: 'title', header: 'Title', sortable: true, render: (b) => <span className="font-medium">{b.title}</span> },
    { key: 'courseSlug', header: 'Course', render: (b) => b.courseSlug || '—' },
    { key: 'fileUrl', header: 'File', render: (b) => (b.fileUrl ? <a href={b.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline">Download</a> : '—') },
    { key: 'isActive', header: 'Status', render: (b) => activeCell(b.isActive) },
  ],
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 1 },
    { name: 'courseSlug', label: 'Course slug', type: 'text', colSpan: 1 },
    { name: 'fileUrl', label: 'Brochure file', type: 'file', accept: 'document', required: true, uploadFolder: 'brochures' },
    { name: 'isActive', label: 'Active', type: 'switch', colSpan: 1, defaultValue: true },
  ],
};

export const batchConfig: ResourceConfig<Batch> = {
  key: 'batches',
  endpoint: '/batches',
  singular: 'Batch',
  plural: 'Batches',
  description: 'Upcoming batch start dates and availability.',
  icon: CalendarClock,
  defaultSort: 'order',
  defaultOrder: 'asc',
  columns: [
    { key: 'course', header: 'Course', sortable: true, render: (b) => <span className="font-medium">{b.course}</span> },
    { key: 'startDate', header: 'Starts', render: (b) => b.startDate || '—' },
    { key: 'mode', header: 'Mode', render: (b) => <Badge variant="outline">{b.mode}</Badge> },
    { key: 'seats', header: 'Seats', render: (b) => <span className="tabular">{b.seats ?? '—'}</span> },
    { key: 'isActive', header: 'Status', render: (b) => activeCell(b.isActive) },
  ],
  fields: [
    { name: 'course', label: 'Course', type: 'text', required: true, colSpan: 1 },
    {
      name: 'mode',
      label: 'Mode',
      type: 'select',
      colSpan: 1,
      defaultValue: 'Online',
      options: [
        { label: 'Online', value: 'Online' },
        { label: 'Offline', value: 'Offline' },
        { label: 'Hybrid', value: 'Hybrid' },
      ],
    },
    { name: 'startDate', label: 'Start date', type: 'text', colSpan: 1, placeholder: 'Jun 10, 2026' },
    { name: 'timing', label: 'Timing', type: 'text', colSpan: 1, placeholder: 'Weekends, 10am' },
    { name: 'seats', label: 'Seats left', type: 'number', colSpan: 1 },
    { name: 'order', label: 'Sort order', type: 'number', colSpan: 1 },
    { name: 'isActive', label: 'Active', type: 'switch', colSpan: 1, defaultValue: true },
  ],
};

// Lookup by route segment so a single page component can serve them all.
export const resourceConfigs = {
  categories: categoryConfig,
  authors: authorConfig,
  trainers: trainerConfig,
  testimonials: testimonialConfig,
  placements: placementConfig,
  companies: companyConfig,
  roadmaps: roadmapConfig,
  faqs: faqConfig,
  comparisons: comparisonConfig,
  localities: localityConfig,
  legal: legalConfig,
  gallery: galleryConfig,
  brochures: brochureConfig,
  batches: batchConfig,
} as const;

export type ResourceKey = keyof typeof resourceConfigs;

