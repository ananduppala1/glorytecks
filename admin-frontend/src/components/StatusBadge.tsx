import { Badge } from '@/components/ui/badge';
import type { ContentStatus, LeadStatus } from '@/types';
import { titleCase } from '@/lib/utils';

const CONTENT_VARIANT: Record<ContentStatus, React.ComponentProps<typeof Badge>['variant']> = {
  published: 'success',
  draft: 'muted',
  archived: 'outline',
};

const LEAD_VARIANT: Record<LeadStatus, React.ComponentProps<typeof Badge>['variant']> = {
  new: 'primary',
  contacted: 'warning',
  converted: 'success',
  closed: 'muted',
};

export function StatusBadge({ status }: { status?: ContentStatus | LeadStatus }) {
  if (!status) return null;
  const variant =
    status in CONTENT_VARIANT
      ? CONTENT_VARIANT[status as ContentStatus]
      : LEAD_VARIANT[status as LeadStatus];
  return (
    <Badge variant={variant}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {titleCase(status)}
    </Badge>
  );
}
