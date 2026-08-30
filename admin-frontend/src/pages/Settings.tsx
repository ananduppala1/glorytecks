import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { apiGet, apiPut, getErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/Field';
import { ImageUpload } from '@/components/ImageUpload';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { toast } from '@/components/ui/sonner';
import type { Settings } from '@/types';

export function SettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => (await apiGet<Settings>('/settings')).data,
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) return <FullScreenLoader />;

  const set = (patch: Partial<Settings>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setSocial = (patch: Partial<NonNullable<Settings['social']>>) =>
    setForm((f) => (f ? { ...f, social: { ...f.social, ...patch } } : f));
  const setStats = (patch: Partial<NonNullable<Settings['stats']>>) =>
    setForm((f) => (f ? { ...f, stats: { ...f.stats, ...patch } } : f));
  const setSeo = (patch: Partial<NonNullable<Settings['seo']>>) =>
    setForm((f) => (f ? { ...f, seo: { ...f.seo, ...patch } } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await apiPut('/settings', form);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Global site details used across the public website."
        actions={
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl space-y-4">
        <Section title="Contact">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <Input value={form.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="WhatsApp number">
              <Input value={form.whatsapp ?? ''} onChange={(e) => set({ whatsapp: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={form.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
            </Field>
            <Field label="Google Maps URL">
              <Input value={form.mapUrl ?? ''} onChange={(e) => set({ mapUrl: e.target.value })} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea value={form.address ?? ''} onChange={(e) => set({ address: e.target.value })} rows={2} />
            </Field>
          </div>
        </Section>

        <Section title="Social links">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Facebook">
              <Input value={form.social?.facebook ?? ''} onChange={(e) => setSocial({ facebook: e.target.value })} />
            </Field>
            <Field label="Instagram">
              <Input value={form.social?.instagram ?? ''} onChange={(e) => setSocial({ instagram: e.target.value })} />
            </Field>
            <Field label="LinkedIn">
              <Input value={form.social?.linkedin ?? ''} onChange={(e) => setSocial({ linkedin: e.target.value })} />
            </Field>
            <Field label="YouTube">
              <Input value={form.social?.youtube ?? ''} onChange={(e) => setSocial({ youtube: e.target.value })} />
            </Field>
            <Field label="Twitter / X">
              <Input value={form.social?.twitter ?? ''} onChange={(e) => setSocial({ twitter: e.target.value })} />
            </Field>
          </div>
        </Section>

        <Section title="Homepage stats" description="Headline numbers shown on the marketing site.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Students trained">
              <Input value={form.stats?.studentsTrained ?? ''} onChange={(e) => setStats({ studentsTrained: e.target.value })} />
            </Field>
            <Field label="Placement rate">
              <Input value={form.stats?.placementRate ?? ''} onChange={(e) => setStats({ placementRate: e.target.value })} />
            </Field>
            <Field label="Hiring partners">
              <Input value={form.stats?.hiringPartners ?? ''} onChange={(e) => setStats({ hiringPartners: e.target.value })} />
            </Field>
            <Field label="Courses offered">
              <Input value={form.stats?.coursesOffered ?? ''} onChange={(e) => setStats({ coursesOffered: e.target.value })} />
            </Field>
          </div>
        </Section>

        <Section title="Default SEO">
          <div className="grid grid-cols-1 gap-4">
            <Field label="Default meta title">
              <Input value={form.seo?.metaTitle ?? ''} onChange={(e) => setSeo({ metaTitle: e.target.value })} />
            </Field>
            <Field label="Default meta description">
              <Textarea value={form.seo?.metaDescription ?? ''} onChange={(e) => setSeo({ metaDescription: e.target.value })} rows={3} />
            </Field>
            <Field label="Default social share image">
              <ImageUpload value={form.defaultOgImage} onChange={(url) => set({ defaultOgImage: url })} folder="brand" />
            </Field>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
