import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { RowActions } from '@/components/RowActions';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ResourceForm } from '@/features/ResourceForm';
import { createResourceHooks } from '@/hooks/useResource';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import type { ResourceConfig, FieldDef } from '@/features/formTypes';

function buildDefaults(fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.defaultValue !== undefined) {
      out[f.name] = f.defaultValue;
      continue;
    }
    switch (f.type) {
      case 'switch':
        out[f.name] = false;
        break;
      case 'number':
        out[f.name] = 0;
        break;
      case 'tags':
      case 'objectlist':
        out[f.name] = [];
        break;
      case 'salary':
        out[f.name] = { fresher: '', mid: '', senior: '' };
        break;
      default:
        out[f.name] = '';
    }
  }
  return out;
}

// Pull only the editable fields out of a loaded record for the form.
function pickEditable(record: Record<string, unknown>, fields: FieldDef[]): Record<string, unknown> {
  const defaults = buildDefaults(fields);
  const out: Record<string, unknown> = { ...defaults };
  for (const f of fields) {
    const v = record[f.name];
    if (v !== undefined && v !== null) out[f.name] = v;
  }
  return out;
}

interface ResourcePageProps<T extends { id: string }> {
  config: ResourceConfig<T>;
}

export function ResourcePage<T extends { id: string }>({ config }: ResourcePageProps<T>) {
  const hooks = useMemo(() => createResourceHooks<T>(config.endpoint, config.key), [config]);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(config.defaultSort ?? 'createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>(config.defaultOrder ?? 'desc');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const listQuery = hooks.useList({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    sort,
    order,
  });
  const createMut = hooks.useCreate();
  const updateMut = hooks.useUpdate();
  const removeMut = hooks.useRemove();

  const handleSort = (key: string) => {
    if (sort === key) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setOrder('asc');
    }
  };

  const actionsColumn: Column<T> = {
    key: '__actions',
    header: '',
    headClassName: 'w-10',
    className: 'text-right',
    render: (row) => (
      <RowActions>
        <DropdownMenuItem onClick={() => setEditing(row)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </RowActions>
    ),
  };

  const columns = [...config.columns, actionsColumn];

  const handleCreate = async (values: Record<string, unknown>) => {
    try {
      const payload = config.prepareSubmit
        ? config.prepareSubmit(values, 'create')
        : values;

      await createMut.mutateAsync(payload as Partial<T>);
      toast.success(`${config.singular} created`);
      setCreating(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!editing) return;

    try {
      const payload = config.prepareSubmit
        ? config.prepareSubmit(values, 'edit')
        : values;

      await updateMut.mutateAsync({
        id: editing.id,
        payload: payload as Partial<T>,
      });
      toast.success(`${config.singular} updated`);
      setEditing(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeMut.mutateAsync(deleteTarget.id);
      toast.success(`${config.singular} deleted`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title={config.plural}
        description={config.description}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New {config.singular}
          </Button>
        }
      />

      <DataTable<T>
        columns={columns}
        data={listQuery.data?.items ?? []}
        loading={listQuery.isLoading}
        rowKey={(r) => r.id}
        onRowClick={(r) => setEditing(r)}
        search={config.searchable === false ? undefined : search}
        onSearchChange={config.searchable === false ? undefined : setSearch}
        searchPlaceholder={`Search ${config.plural.toLowerCase()}…`}
        sort={sort}
        order={order}
        onSortChange={handleSort}
        meta={listQuery.data?.meta}
        onPageChange={setPage}
        emptyIcon={config.icon}
        emptyTitle={`No ${config.plural.toLowerCase()} yet`}
        emptyDescription={`Create your first ${config.singular.toLowerCase()} to get started.`}
      />

      {/* Create */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className={config.dialogWide ? 'max-w-3xl' : 'max-w-xl'}>
          <DialogHeader>
            <DialogTitle>New {config.singular}</DialogTitle>
            <DialogDescription>Add a new {config.singular.toLowerCase()}.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-0.5">
            <ResourceForm
              fields={config.fields}
              defaultValues={buildDefaults(config.fields)}
              onSubmit={handleCreate}
              submitting={createMut.isPending}
              submitLabel={`Create ${config.singular.toLowerCase()}`}
              onCancel={() => setCreating(false)}
              mode="create"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className={config.dialogWide ? 'max-w-3xl' : 'max-w-xl'}>
          <DialogHeader>
            <DialogTitle>Edit {config.singular}</DialogTitle>
            <DialogDescription>Update the details below.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-0.5">
            {editing && (
              <ResourceForm
                fields={config.fields}
                defaultValues={
                  config.prepareEdit
                    ? config.prepareEdit(editing)
                    : pickEditable(
                        editing as Record<string, unknown>,
                        config.fields,
                      )
                }
                onSubmit={handleUpdate}
                submitting={updateMut.isPending}
                onCancel={() => setEditing(null)}
                submitLabel="Save changes"
                mode="edit"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete ${config.singular.toLowerCase()}?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
