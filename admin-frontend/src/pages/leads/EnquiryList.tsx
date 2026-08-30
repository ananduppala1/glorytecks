import { LeadsView, LeadRecord } from './LeadsView';
import type { Column } from '@/components/DataTable';
import { truncate } from '@/lib/utils';

const columns: Column<LeadRecord>[] = [
  { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'email', header: 'Email', render: (r) => <span className="text-muted-foreground">{r.email}</span> },
  { key: 'course', header: 'Course', render: (r) => r.course || '—' },
  { key: 'message', header: 'Message', render: (r) => <span className="text-muted-foreground">{truncate(r.message ?? '', 48)}</span> },
];

export function EnquiryListPage() {
  return (
    <LeadsView
      endpoint="/enquiries"
      resourceKey="enquiries"
      title="Enquiries"
      description="Messages submitted through the website contact form."
      columns={columns}
      detailFields={[
        { label: 'Email', key: 'email' },
        { label: 'Phone', key: 'phone' },
        { label: 'Course', key: 'course' },
        { label: 'Subject', key: 'subject' },
        { label: 'Message', key: 'message', full: true },
      ]}
    />
  );
}
