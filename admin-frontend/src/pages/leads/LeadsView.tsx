import { useEffect, useState } from 'react';
import { Trash2, RefreshCw, Download } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/Field';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { createResourceHooks } from '@/hooks/useResource';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuth } from '@/context/AuthContext';
import { apiPatch, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { formatDateTime, cn } from '@/lib/utils';
import type { LeadStatus } from '@/types';

const LEAD_STATUSES: { label: string; value: LeadStatus }[] = [
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Converted', value: 'converted' },
  { label: 'Closed', value: 'closed' },
];

/** Columns exported to CSV (in order). Empty values are simply blank. */
const CSV_FIELDS: { key: keyof LeadRecord; header: string }[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'course', header: 'Course' },
  { key: 'subject', header: 'Subject' },
  { key: 'message', header: 'Message' },
  { key: 'source', header: 'Source' },
  { key: 'status', header: 'Status' },
  { key: 'createdAt', header: 'Received' },
];

/** Escape a single CSV cell (RFC 4180: wrap in quotes, double internal quotes). */
function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Build a CSV string from lead records and trigger a client-side download. */
function downloadLeadsCsv(records: LeadRecord[], filenamePrefix: string): void {
  const header = CSV_FIELDS.map((f) => csvCell(f.header)).join(',');
  const rows = records.map((r) =>
    CSV_FIELDS.map((f) => csvCell(r[f.key])).join(','),
  );
  // Prefix BOM so Excel opens UTF-8 correctly.
  const csv = '\uFEFF' + [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${filenamePrefix}-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface LeadRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  course?: string;
  subject?: string;
  message?: string;
  source?: string;
  status: LeadStatus;
  notes?: string;
  createdAt?: string;
}

interface DetailFieldDef {
  label: string;
  key: keyof LeadRecord;
  full?: boolean;
}

interface LeadsViewProps {
  endpoint: string;
  resourceKey: string;
  title: string;
  description: string;
  columns: Column<LeadRecord>[];
  detailFields: DetailFieldDef[];
}

export function LeadsView({
  endpoint,
  resourceKey,
  title,
  description,
  columns,
  detailFields,
}: LeadsViewProps) {
  const hooks = createResourceHooks<LeadRecord>(endpoint, resourceKey);
  const { hasRole } = useAuth();
  // "Download CSV" is a receptionist-only capability; admin behaviour is unchanged.
  const canExportCsv = hasRole('receptionist');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LeadRecord | null>(null);
  // console.log(selected);
  const [deleteTarget, setDeleteTarget] = useState<LeadRecord | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const listQuery = hooks.useList({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    sort: 'createdAt',
    order: 'desc',
    status: status === 'all' ? undefined : status,
  });
  const removeMut = hooks.useRemove();

  const statusColumn: Column<LeadRecord> = {
    key: 'status',
    header: 'Status',
    render: (r) => <StatusBadge status={r.status} />,
  };
  const receivedColumn: Column<LeadRecord> = {
    key: 'createdAt',
    header: 'Received',
    render: (r) => <span className="tabular text-muted-foreground">{formatDateTime(r.createdAt)}</span>,
  };

  const tableColumns = [...columns, statusColumn, receivedColumn];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeMut.mutateAsync(deleteTarget.id);
      toast.success('Lead deleted');
      setDeleteTarget(null);
      setSelected(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Re-fetch only the latest records for this page — no browser/page reload.
  // Current filters (search + status + page) are preserved because they're state.
  const handleRefresh = () => {
    void listQuery.refetch();
  };

  const handleDownloadCsv = () => {
    const records = listQuery.data?.items ?? [];
    if (!records.length) {
      toast.error('No records to export');
      return;
    }
    downloadLeadsCsv(records, resourceKey);
    toast.success(`Exported ${records.length} record${records.length === 1 ? '' : 's'} to CSV`);
  };

  return (
    <div>
      <PageHeader title={title} description={description} />

      <DataTable<LeadRecord>
        columns={tableColumns}
        data={listQuery.data?.items ?? []}
        loading={listQuery.isLoading}
        rowKey={(r) => r.id}
        onRowClick={(r) => setSelected(r)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name…"
        meta={listQuery.data?.meta}
        onPageChange={setPage}
        emptyTitle="No leads yet"
        emptyDescription="New submissions from the website will appear here."
        toolbarExtra={
          <>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={listQuery.isFetching}
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', listQuery.isFetching && 'animate-spin')} />
            </Button>

            {canExportCsv && (
              <Button variant="outline" onClick={handleDownloadCsv}>
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            )}
          </>
        }
      />

      <LeadDetailDialog
        lead={selected}
        endpoint={endpoint}
        resourceKey={resourceKey}
        detailFields={detailFields}
        onClose={() => setSelected(null)}
        onDelete={() => selected && setDeleteTarget(selected)}
        onSaved={() => listQuery.refetch()}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)} 
        title="Delete this lead?"
        description="This permanently removes the submission."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

function LeadDetailDialog({
  lead,
  endpoint,
  detailFields,
  onClose,
  onDelete,
  onSaved,
}: {
  lead: LeadRecord | null;
  endpoint: string;
  resourceKey: string;
  detailFields: DetailFieldDef[];
  onClose: () => void;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<LeadStatus>('new');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setStatus(lead.status);
      setNotes(lead.notes ?? '');
    }
  }, [lead]);

  const save = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      await apiPatch(`${endpoint}/${lead.id}/status`, { status, notes });
      toast.success('Lead updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(lead)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead?.name}</DialogTitle>
        </DialogHeader>

        {lead && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              {detailFields.map((f) => {
                const value = lead[f.key];
                if (!value) return null;
                return (
                  <div key={String(f.key)} className={f.full ? 'col-span-2' : ''}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {f.label}
                    </dt>
                    <dd className="mt-0.5 break-words text-foreground">{String(value)}</dd>
                  </div>
                );
              })}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Received
                </dt>
                <dd className="mt-0.5 text-foreground tabular">{formatDateTime(lead.createdAt)}</dd>
              </div>
            </dl>

            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Internal notes" hint="Only visible to admins">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add a note about this lead…"
              />
            </Field>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onDelete} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
