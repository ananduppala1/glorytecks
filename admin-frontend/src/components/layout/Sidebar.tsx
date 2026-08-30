import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { navGroups, canAccessPath } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { apiGet } from '@/lib/api';
import type { DashboardStats } from '@/types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
          <path
            d="M12 3l7 3.5v5C19 16 16 19.5 12 21c-4-1.5-7-5-7-9.5v-5L12 3z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 12l2.4 2.4L15.5 9.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-sidebar-foreground">GloryTecks</div>
        <div className="text-2xs font-medium uppercase tracking-wider text-sidebar-muted">
          Admin Console
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { hasRole, user } = useAuth();

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => (await apiGet<DashboardStats>('/dashboard/stats')).data,
    staleTime: 60_000,
  });

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-foreground/20 backdrop-blur-[1px] transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <BrandMark />
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-sidebar-muted hover:bg-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {navGroups.map((group) => {
            const items = group.items.filter(
              (i) => (!i.adminOnly || hasRole('admin')) && canAccessPath(user?.role, i.to),
            );
            if (!items.length) return null;
            return (
              <div key={group.label}>
                <div className="nav-group-label">{group.label}</div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const badge =
                      item.badgeKey && stats?.counts ? stats.counts[item.badgeKey] : 0;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={onClose}
                        className={({ isActive }) => cn('nav-item', isActive && 'is-active')}
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0',
                                isActive ? 'text-primary' : 'text-sidebar-muted',
                              )}
                            />
                            <span className="flex-1 truncate">{item.label}</span>
                            {badge > 0 && (
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground tabular">
                                {badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
