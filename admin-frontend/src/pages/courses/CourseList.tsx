import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, GraduationCap, Star } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { RowActions } from '@/components/RowActions';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { createResourceHooks } from '@/hooks/useResource';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import type { Course } from '@/types';

const courseHooks = createResourceHooks<Course>('/courses', 'courses');

export function CourseListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('order');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const listQuery = courseHooks.useList({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    sort,
    order,
  });
  const removeMut = courseHooks.useRemove();

  const handleSort = (key: string) => {
    if (sort === key) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setOrder('asc');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeMut.mutateAsync(deleteTarget.id);
      toast.success('Course deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns: Column<Course>[] = [
    {
      key: 'title',
      header: 'Course',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2">
          {c.featured && <Star className="h-3.5 w-3.5 fill-warning text-warning" />}
          <span className="font-medium">{c.title}</span>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (c) => c.category || '—' },
    { key: 'duration', header: 'Duration', render: (c) => <span className="tabular">{c.duration || '—'}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (c) => <StatusBadge status={c.status} /> },
    {
      key: '__actions',
      header: '',
      headClassName: 'w-10',
      className: 'text-right',
      render: (c) => (
        <RowActions>
          <DropdownMenuItem onClick={() => navigate(`/courses/${c.id}`)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(c)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Courses"
        description="Manage course catalogue, syllabus and details."
        actions={
          <Button onClick={() => navigate('/courses/new')}>
            <Plus className="h-4 w-4" />
            New course
          </Button>
        }
      />

      <DataTable<Course>
        columns={columns}
        data={listQuery.data?.items ?? []}
        loading={listQuery.isLoading}
        rowKey={(c) => c.id ?? c._id!}
        onRowClick={(c) => navigate(`/courses/${c.id ?? c._id!}`)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search courses…"
        sort={sort}
        order={order}
        onSortChange={handleSort}
        meta={listQuery.data?.meta}
        onPageChange={setPage}
        emptyIcon={GraduationCap}
        emptyTitle="No courses yet"
        emptyDescription="Create your first course to populate the catalogue."
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this course?"
        description={deleteTarget ? `"${deleteTarget.title}" will be permanently removed.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
