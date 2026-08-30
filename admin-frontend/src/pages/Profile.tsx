import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/Field';
import { ImageUpload } from '@/components/ImageUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/sonner';
import { initialsOf, titleCase } from '@/lib/utils';

interface ProfileForm {
  name: string;
}
interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileForm = useForm<ProfileForm>({ defaultValues: { name: user?.name ?? '' } });
  const passwordForm = useForm<PasswordForm>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const saveProfile = async (values: ProfileForm) => {
    setSavingProfile(true);
    try {
      await api.patch('/auth/profile', { name: values.name, avatar });
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (values: PasswordForm) => {
    if (values.newPassword !== values.confirmPassword) {
      passwordForm.setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed');
      passwordForm.reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <PageHeader title="Your Profile" description="Manage your account details and password." />

      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="mb-5 flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {avatar && <AvatarImage src={avatar} alt={user?.name} />}
              <AvatarFallback className="text-sm">{user ? initialsOf(user.name) : '–'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{user?.name}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{user?.email}</span>
                {user && <Badge variant="primary">{titleCase(user.role)}</Badge>}
              </div>
            </div>
          </div>

          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
            <Field label="Display name" error={profileForm.formState.errors.name?.message}>
              <Input
                {...profileForm.register('name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })}
              />
            </Field>
            <Field label="Avatar">
              <ImageUpload value={avatar} onChange={setAvatar} folder="avatars" />
            </Field>
            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit" loading={savingProfile}>
                <Save className="h-4 w-4" />
                Save profile
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Change password</h3>
          </div>
          <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
            <Field label="Current password" error={passwordForm.formState.errors.currentPassword?.message}>
              <Input
                type="password"
                autoComplete="current-password"
                {...passwordForm.register('currentPassword', { required: 'Current password is required' })}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="New password" error={passwordForm.formState.errors.newPassword?.message}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('newPassword', {
                    required: 'New password is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                  })}
                />
              </Field>
              <Field label="Confirm password" error={passwordForm.formState.errors.confirmPassword?.message}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register('confirmPassword', { required: 'Please confirm' })}
                />
              </Field>
            </div>
            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit" variant="outline" loading={savingPassword}>
                Update password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
