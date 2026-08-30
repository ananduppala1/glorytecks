import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { navGroups } from '@/lib/nav';

/** Resolve a readable page title from the current path. */
function usePageTitle(): string {
  const { pathname } = useLocation();
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/profile')) return 'Your Profile';

  const segment = `/${pathname.split('/')[1]}`;
  for (const group of navGroups) {
    const match = group.items.find((i) => i.to === segment);
    if (match) {
      const isNew = pathname.endsWith('/new');
      const isEdit = pathname.split('/').length > 2 && !isNew;
      if (isNew) return `New ${singular(match.label)}`;
      if (isEdit) return `Edit ${singular(match.label)}`;
      return match.label;
    }
  }
  return 'GloryTecks Admin';
}

function singular(label: string): string {
  if (label.endsWith('ies')) return `${label.slice(0, -3)}y`;
  if (label === 'FAQs') return 'FAQ';
  if (label.endsWith('s')) return label.slice(0, -1);
  return label;
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = usePageTitle();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-[1320px] px-4 py-6 lg:px-8 lg:py-8">
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
