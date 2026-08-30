import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText,
  GraduationCap,
  Inbox,
  PhoneCall,
  Users,
  Trophy,
  ArrowRight,
  TrendingUp,
  LucideIcon,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/utils';
import type { DashboardStats } from '@/types';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  to: string;
  sub?: string;
}

function StatCard({ label, value, icon: Icon, to, sub }: StatCardProps) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/30 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-3">
        <div className="text-2xl font-semibold tracking-tight tabular">{value.toLocaleString('en-IN')}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground/80">{sub}</div>}
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => (await apiGet<DashboardStats>('/dashboard/stats')).data,
  });

  const c = data?.counts;
  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {greeting}
          {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening across the GloryTecks site today.
        </p>
      </div>

      {/* Stat grid */}
      {isLoading || !c ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[112px] rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Blog posts"
            value={c.blogs}
            icon={FileText}
            to="/blogs"
            sub={`${c.publishedBlogs} published · ${c.draftBlogs} draft`}
          />
          <StatCard label="Courses" value={c.courses} icon={GraduationCap} to="/courses" />
          <StatCard
            label="New enquiries"
            value={c.newEnquiries}
            icon={Inbox}
            to="/enquiries"
            sub={`${c.enquiries} total`}
          />
          <StatCard
            label="Demo requests"
            value={c.newDemoRequests}
            icon={PhoneCall}
            to="/demo-requests"
            sub={`${c.demoRequests} total`}
          />
          <StatCard label="Trainers" value={c.trainers} icon={Users} to="/trainers" />
          <StatCard label="Placements" value={c.placements} icon={Trophy} to="/placements" />
          <StatCard label="Testimonials" value={c.testimonials} icon={TrendingUp} to="/testimonials" />
          <StatCard label="Hiring partners" value={c.companies} icon={GraduationCap} to="/companies" />
        </div>
      )}

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent blogs */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold">Recent posts</h3>
            <Link to="/blogs" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              <SkeletonRows />
            ) : data?.recent.blogs.length ? (
              data.recent.blogs.map((b) => (
                <Link
                  key={b.id}
                  to={`/blogs/${b.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{b.category}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              ))
            ) : (
              <EmptyState icon={FileText} title="No posts yet" />
            )}
          </div>
        </Card>

        {/* Recent enquiries */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold">Latest enquiries</h3>
            <Link to="/enquiries" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              <SkeletonRows />
            ) : data?.recent.enquiries.length ? (
              data.recent.enquiries.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.course || 'General'} · {formatDateTime(e.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
              ))
            ) : (
              <EmptyState icon={Inbox} title="No enquiries yet" />
            )}
          </div>
        </Card>

        {/* Recent demo requests */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold">Demo requests</h3>
            <Link to="/demo-requests" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? (
              <SkeletonRows />
            ) : data?.recent.demoRequests.length ? (
              data.recent.demoRequests.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.course || 'General'} · {d.phone}
                    </p>
                  </div>
                  <Badge variant="outline" className="tabular">
                    {formatDateTime(d.createdAt)}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyState icon={PhoneCall} title="No demo requests yet" />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
