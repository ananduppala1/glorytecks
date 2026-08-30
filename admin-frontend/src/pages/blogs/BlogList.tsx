import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Copy, Trash2, Send, Archive, FileText, Star } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { RowActions } from '@/components/RowActions';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { createResourceHooks } from '@/hooks/useResource';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { apiPost, apiPatch, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { formatDate, titleCase } from '@/lib/utils';
import type { Blog } from '@/types';

const blogHooks = createResourceHooks<Blog>('/blogs', 'blogs');

export function BlogListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteTarget, setDeleteTarget] = useState<Blog | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const listQuery = blogHooks.useList({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    sort,
    order,
    status: status === 'all' ? undefined : status,
  });
  const removeMut = blogHooks.useRemove();

  const refresh = () => qc.invalidateQueries({ queryKey: ['blogs'] });

  const duplicate = async (b: Blog) => {
    try {
      const res = await apiPost<Blog>(`/blogs/${b.id}/duplicate`);
      toast.success('Post duplicated');
      refresh();
      navigate(`/blogs/${res.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const setStatusOf = async (b: Blog, next: Blog['status']) => {
    try {
      await apiPatch(`/blogs/${b.id}/status`, { status: next });
      toast.success(`Post ${next}`);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeMut.mutateAsync(deleteTarget.id);
      toast.success('Post deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSort = (key: string) => {
    if (sort === key) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setOrder('desc');
    }
  };

  const columns: Column<Blog>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        render: (b) => (
          <div className="flex items-center gap-2">
            {b.featured && <Star className="h-3.5 w-3.5 fill-warning text-warning" />}
            <span className="font-medium">{b.title}</span>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        render: (b) => <span className="text-muted-foreground">{b.category}</span>,
      },
      {
        key: 'kind',
        header: 'Type',
        render: (b) => <Badge variant="outline">{titleCase(b.kind)}</Badge>,
      },
      { key: 'status', header: 'Status', sortable: true, render: (b) => <StatusBadge status={b.status} /> },
      {
        key: 'date',
        header: 'Updated',
        sortable: true,
        render: (b) => <span className="tabular text-muted-foreground">{formatDate(b.updated || b.date)}</span>,
      },
      {
        key: '__actions',
        header: '',
        headClassName: 'w-10',
        className: 'text-right',
        render: (b) => (
          <RowActions>
            <DropdownMenuItem onClick={() => navigate(`/blogs/${b.id}`)}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicate(b)}>
              <Copy />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {b.status !== 'published' && (
              <DropdownMenuItem onClick={() => setStatusOf(b, 'published')}>
                <Send />
                Publish
              </DropdownMenuItem>
            )}
            {b.status !== 'archived' && (
              <DropdownMenuItem onClick={() => setStatusOf(b, 'archived')}>
                <Archive />
                Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(b)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </RowActions>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
  );

  return (
    <div>
      <PageHeader
        title="Blog Posts"
        description="Write and manage articles, guides and comparisons."
        actions={
          <Button onClick={() => navigate('/blogs/new')}>
            <Plus className="h-4 w-4" />
            New post
          </Button>
        }
      />

      <DataTable<Blog>
        columns={columns}
        data={listQuery.data?.items ?? []}
        loading={listQuery.isLoading}
        rowKey={(b) => b.id ?? b._id!}
        onRowClick={(b) => navigate(`/blogs/${b.id ?? b._id!}`)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search posts…"
        sort={sort}
        order={order}
        onSortChange={handleSort}
        meta={listQuery.data?.meta}
        onPageChange={setPage}
        emptyIcon={FileText}
        emptyTitle="No posts found"
        emptyDescription="Try a different search, or create a new post."
        toolbarExtra={
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
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this post?"
        description={deleteTarget ? `"${deleteTarget.title}" will be permanently removed.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
