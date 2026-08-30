import { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { DataTable, Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/Field';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { RowActions } from '@/components/RowActions';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { createResourceHooks } from '@/hooks/useResource';
import { getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime, initialsOf, titleCase } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { AdminUser, Role } from '@/types';

const adminHooks = createResourceHooks<AdminUser>('/admins', 'admins');

const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Receptionist', value: 'receptionist' },
  { label: 'Content Writer', value: 'content_writer' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
];

interface AdminForm {
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const listQuery = adminHooks.useList({ limit: 100, sort: 'createdAt', order: 'desc' });
  const createMut = adminHooks.useCreate();
  const updateMut = adminHooks.useUpdate();
  const removeMut = adminHooks.useRemove();

  const form = useForm<AdminForm>({
    defaultValues: { name: '', email: '', password: '', role: 'admin', isActive: true },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', email: '', password: '', role: 'admin', isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (admin: AdminUser) => {
    setEditing(admin);
    form.reset({
      name: admin.name,
      email: admin.email,
      password: '',
      role: admin.role,
      isActive: admin.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: AdminForm) => {
    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          payload: { name: values.name, role: values.role, isActive: values.isActive },
        });
        toast.success('Admin updated');
      } else {
        await createMut.mutateAsync({
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
        } as Partial<AdminUser>);
        toast.success('Admin created');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeMut.mutateAsync(deleteTarget.id);
      toast.success('Admin removed');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (a) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7">
            {a.avatar && <AvatarImage src={a.avatar} alt={a.name} />}
            <AvatarFallback className="text-2xs">{initialsOf(a.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{a.name}</div>
            <div className="text-xs text-muted-foreground">{a.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (a) => <Badge variant={a.role === 'admin' ? 'primary' : 'muted'}>{titleCase(a.role)}</Badge>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (a) =>
        a.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Disabled</Badge>,
    },
    {
      key: 'lastLoginAt',
      header: 'Last login',
      render: (a) => <span className="tabular text-muted-foreground">{a.lastLoginAt ? formatDateTime(a.lastLoginAt) : 'Never'}</span>,
    },
    {
      key: '__actions',
      header: '',
      headClassName: 'w-10',
      className: 'text-right',
      render: (a) => (
        <RowActions>
          <DropdownMenuItem onClick={() => openEdit(a)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={a.id === currentUser?.id}
            onClick={() => setDeleteTarget(a)}
          >
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
        title="Admin Users"
        description="People who can sign in and manage this dashboard."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New admin
          </Button>
        }
      />

      <DataTable<AdminUser>
        columns={columns}
        data={listQuery.data?.items ?? []}
        loading={listQuery.isLoading}
        rowKey={(a) => a.id}
        emptyIcon={ShieldCheck}
        emptyTitle="No admins yet"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit admin' : 'New admin'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update role and access for this user.' : 'Invite a new dashboard user.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Name" required error={form.formState.errors.name?.message}>
              <Input {...form.register('name', { required: 'Name is required' })} />
            </Field>
            <Field label="Email" required error={form.formState.errors.email?.message}>
              <Input
                type="email"
                disabled={Boolean(editing)}
                {...form.register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                })}
              />
            </Field>
            {!editing && (
              <Field label="Temporary password" required error={form.formState.errors.password?.message} hint="At least 8 characters">
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...form.register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                  })}
                />
              </Field>
            )}
            <Field label="Role">
              <Select value={form.watch('role')} onValueChange={(v) => form.setValue('role', v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {editing && (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Account active</p>
                  <p className="text-xs text-muted-foreground">Disabled users cannot sign in.</p>
                </div>
                <Switch checked={form.watch('isActive')} onCheckedChange={(v) => form.setValue('isActive', v)} />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMut.isPending || updateMut.isPending}>
                {editing ? 'Save changes' : 'Create admin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remove this admin?"
        description={deleteTarget ? `${deleteTarget.name} will lose dashboard access.` : ''}
        confirmLabel="Remove"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
