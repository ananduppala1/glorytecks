import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  GraduationCap,
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
  Inbox,
  PhoneCall,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Optional badge key resolved from dashboard counts (e.g. new leads). */
  badgeKey?: 'newEnquiries' | 'newDemoRequests';
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
   {
    label: 'Site Content',
    items: [
      { label: 'Home Hero', to: '/home-hero', icon: Sparkles },
      { label: 'About Us', to: '/about-us', icon: Info },
      { label: 'Roadmaps', to: '/roadmaps', icon: Route },
      { label: 'FAQs', to: '/faqs', icon: HelpCircle },
      { label: 'Comparisons', to: '/comparisons', icon: GitCompareArrows },
      { label: 'Localities', to: '/localities', icon: MapPin },
      { label: 'Legal Pages', to: '/legal', icon: Scale },
      { label: 'Gallery', to: '/gallery', icon: Images },
      { label: 'Brochures', to: '/brochures', icon: FileDown },
      { label: 'Batches', to: '/batches', icon: CalendarClock },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Blog Posts', to: '/blogs', icon: FileText },
      { label: 'Courses', to: '/courses', icon: GraduationCap },
      { label: 'Categories', to: '/categories', icon: FolderTree },
      { label: 'Authors', to: '/authors', icon: PenLine },
    ],
  },
  {
    label: 'People & Proof',
    items: [
      { label: 'Trainers', to: '/trainers', icon: Users },
      { label: 'Testimonials', to: '/testimonials', icon: Quote },
      { label: 'Placements', to: '/placements', icon: Trophy },
      { label: 'Hiring Partners', to: '/companies', icon: Building2 },
    ],
  },
  {
    label: 'Leads',
    items: [
      { label: 'Enquiries', to: '/enquiries', icon: Inbox, badgeKey: 'newEnquiries' },
      { label: 'Demo Requests', to: '/demo-requests', icon: PhoneCall, badgeKey: 'newDemoRequests' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', to: '/settings', icon: SettingsIcon },
      { label: 'Admin Users', to: '/admins', icon: ShieldCheck, adminOnly: true },
    ],
  },
];

/**
 * Role-based navigation access.
 *
 * Admin sees everything (unchanged). The restricted roles below only ever see
 * the routes listed here — both in the sidebar and (enforced separately) in the
 * router. Any other/legacy role (editor, viewer) keeps broad access, minus
 * `adminOnly` items, exactly as before.
 */
export const ROLE_NAV: Partial<Record<Role, string[]>> = {
  receptionist: ['/enquiries', '/demo-requests'],
  content_writer: [
    '/blogs',
    '/courses',
    '/categories',
    '/authors',
    '/trainers',
    '/testimonials',
    '/placements',
    '/companies',
  ],
};

/** Where each role should land when it opens the dashboard root ("/"). */
export const ROLE_HOME: Partial<Record<Role, string>> = {
  receptionist: '/enquiries',
  content_writer: '/blogs',
};

/** Whether a given role may access a route path. */
export function canAccessPath(role: Role | undefined, to: string): boolean {
  if (role === 'admin') return true;
  const restricted = role ? ROLE_NAV[role] : undefined;
  if (restricted) {
    return restricted.some((p) => to === p || to.startsWith(`${p}/`));
  }
  // Legacy/unknown roles (editor, viewer): keep broad access as before.
  return true;
}
