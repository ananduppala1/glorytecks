import { LeadsView, LeadRecord } from './LeadsView';
import type { Column } from '@/components/DataTable';

const columns: Column<LeadRecord>[] = [
  { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'phone', header: 'Phone', render: (r) => <span className="tabular text-muted-foreground">{r.phone}</span> },
  { key: 'course', header: 'Course', render: (r) => r.course || '—' },
  { key: 'source', header: 'Source', render: (r) => r.source || '—' },
];

export function DemoRequestListPage() {
  return (
    <LeadsView
      endpoint="/demo-requests"
      resourceKey="demo-requests"
      title="Demo Requests"
      description="Free-demo bookings submitted from the website."
      columns={columns}
      detailFields={[
        { label: 'Phone', key: 'phone' },
        { label: 'Course', key: 'course' },
        { label: 'Source', key: 'source' },
      ]}
    />
  );
}
