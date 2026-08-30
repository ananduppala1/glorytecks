import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPut, getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field } from '@/components/Field';
import { TagInput } from '@/components/TagInput';
import { ImageUpload } from '@/components/ImageUpload';
import { ObjectListInput } from '@/components/ObjectListInput';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { toast } from '@/components/ui/sonner';
import { slugify } from '@/lib/utils';
import type { Course, Trainer, SyllabusSection, ContentStatus, FaqItem } from '@/types';

interface CourseDraft {
  title: string;
  slug: string;
  category: string;
  tagline: string;
  description: string;
  duration: string;
  fees: string;
  placement: string;
  modules: string[];
  tools: string[];
  projects: string[];
  skills: string[];
  syllabus: SyllabusSection[];
  faqs: FaqItem[];
  trainer: string;
  bannerImage: string;
  brochureUrl: string;
  status: ContentStatus;
  featured: boolean;
  order: number;
}

const EMPTY: CourseDraft = {
  title: '',
  slug: '',
  category: '',
  tagline: '',
  description: '',
  duration: '',
  fees: '',
  placement: '',
  modules: [],
  tools: [],
  projects: [],
  skills: [],
  syllabus: [],
  faqs: [],
  trainer: '',
  bannerImage: '',
  brochureUrl: '',
  status: 'published',
  featured: false,
  order: 0,
};

export function CourseFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [draft, setDraft] = useState<CourseDraft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const detailQuery = useQuery<Course>({
    queryKey: ['courses', 'detail', id],
    queryFn: async () => (await apiGet<Course>(`/courses/${id}`)).data,
    enabled: !isNew,
  });

  const { data: trainers } = useQuery<Trainer[]>({
    queryKey: ['trainers', 'all'],
    queryFn: async () => (await apiGet<Trainer[]>('/trainers?limit=100&sort=name&order=asc')).data,
  });

  useEffect(() => {
    if (detailQuery.data) {
      const c = detailQuery.data;
      const trainerId = typeof c.trainer === 'object' && c.trainer ? c.trainer.id : (c.trainer ?? '');
      setDraft({
        title: c.title ?? '',
        slug: c.slug ?? '',
        category: c.category ?? '',
        tagline: c.tagline ?? '',
        description: c.description ?? '',
        duration: c.duration ?? '',
        fees: c.fees ?? '',
        placement: c.placement ?? '',
        modules: c.modules ?? [],
        tools: c.tools ?? [],
        projects: c.projects ?? [],
        skills: c.skills ?? [],
        syllabus: c.syllabus ?? [],
        faqs: c.faqs ?? [],
        trainer: trainerId || '',
        bannerImage: c.bannerImage ?? '',
        brochureUrl: c.brochureUrl ?? '',
        status: c.status ?? 'published',
        featured: Boolean(c.featured),
        order: c.order ?? 0,
      });
    }
  }, [detailQuery.data]);

  const set = <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const trainerOptions = useMemo(
    () => (trainers ?? []).map((t) => ({ label: t.name, value: t.id })),
    [trainers],
  );

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error('A course title is required.');
      return;
    }
    setSaving(true);
    const payload = {
      ...draft,
      slug: draft.slug || slugify(draft.title),
      trainer: draft.trainer || undefined,
    };
    try {
      if (isNew) {
        const res = await apiPost<Course>('/courses', payload);
        toast.success('Course created');
        navigate(`/courses/${res.data.id}`, { replace: true });
      } else {
        await apiPut<Course>(`/courses/${id}`, payload);
        toast.success('Course saved');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && detailQuery.isLoading) return <FullScreenLoader />;

  return (
    <div className="-mx-4 -my-6 lg:-mx-8 lg:-my-8">
      <div className="sticky top-14 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md lg:px-8">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/courses')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {draft.title || (isNew ? 'New course' : 'Untitled course')}
          </p>
          <p className="text-xs text-muted-foreground">{isNew ? 'Draft' : 'Editing course'}</p>
        </div>
        <Select value={draft.status} onValueChange={(v) => set('status', v as ContentStatus)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 lg:px-8">
        {/* Basics */}
        <Section title="Basics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Title" required className="sm:col-span-2">
              <Input value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Data Science Masters" />
            </Field>
            <Field label="Slug" hint="Used in the course URL">
              <div className="flex gap-2">
                <Input
                  value={draft.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder="auto-from-title"
                  className="font-mono text-[0.8125rem]"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => set('slug', slugify(draft.title))}>
                  Auto
                </Button>
              </div>
            </Field>
            <Field label="Category">
              <Input value={draft.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Data & AI" />
            </Field>
            <Field label="Tagline" className="sm:col-span-2">
              <Input value={draft.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="One-line summary" />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea value={draft.description} onChange={(e) => set('description', e.target.value)} rows={4} />
            </Field>
            <Field label="Duration">
              <Input value={draft.duration} onChange={(e) => set('duration', e.target.value)} placeholder="e.g. 6 Months" />
            </Field>
            <Field label="Fees">
              <Input value={draft.fees} onChange={(e) => set('fees', e.target.value)} placeholder="e.g. ₹65,000" />
            </Field>
            <Field label="Placement note" className="sm:col-span-2">
              <Input value={draft.placement} onChange={(e) => set('placement', e.target.value)} placeholder="e.g. 100% placement assistance" />
            </Field>
          </div>
        </Section>

        {/* What you'll learn */}
        <Section title="Skills & tooling">
          <div className="space-y-4">
            <Field label="Modules"><TagInput value={draft.modules} onChange={(v) => set('modules', v)} placeholder="Add module" /></Field>
            <Field label="Tools"><TagInput value={draft.tools} onChange={(v) => set('tools', v)} placeholder="Add tool" /></Field>
            <Field label="Skills gained"><TagInput value={draft.skills} onChange={(v) => set('skills', v)} placeholder="Add skill" /></Field>
            <Field label="Projects"><TagInput value={draft.projects} onChange={(v) => set('projects', v)} placeholder="Add project" /></Field>
          </div>
        </Section>

        {/* Syllabus */}
        <Section title="Syllabus" description="Break the course into sections, each with its own topics.">
          <SyllabusEditor value={draft.syllabus} onChange={(v) => set('syllabus', v)} />
        </Section>

        {/* FAQs */}
        <Section title="FAQs">
          <ObjectListInput
            value={draft.faqs as unknown as Record<string, string>[]}
            onChange={(v) => set('faqs', v as unknown as FaqItem[])}
            subFields={[
              { name: 'q', label: 'Question' },
              { name: 'a', label: 'Answer', type: 'textarea' },
            ]}
          />
        </Section>

        {/* Media & meta */}
        <Section title="Media & assignment">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Lead trainer">
              <Select value={draft.trainer} onValueChange={(v) => set('trainer', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trainer" />
                </SelectTrigger>
                <SelectContent>
                  {trainerOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={draft.order}
                onChange={(e) => set('order', Number(e.target.value))}
              />
            </Field>
            <Field label="Banner image" className="sm:col-span-2">
              <ImageUpload value={draft.bannerImage} onChange={(url) => set('bannerImage', url)} folder="courses" />
            </Field>
            <Field label="Brochure (PDF)" className="sm:col-span-2">
              <ImageUpload value={draft.brochureUrl} onChange={(url) => set('brochureUrl', url)} kind="document" folder="brochures" />
            </Field>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
              <span className="text-sm">Featured course</span>
              <Switch checked={draft.featured} onCheckedChange={(v) => set('featured', v)} />
            </div>
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

function SyllabusEditor({
  value,
  onChange,
}: {
  value: SyllabusSection[];
  onChange: (v: SyllabusSection[]) => void;
}) {
  const addSection = () => onChange([...value, { title: '', items: [] }]);
  const updateSection = (i: number, patch: Partial<SyllabusSection>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeSection = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {value.map((section, i) => (
        <div key={i} className="space-y-2.5 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-semibold text-primary tabular">
              {i + 1}
            </span>
            <Input
              value={section.title}
              onChange={(e) => updateSection(i, { title: e.target.value })}
              placeholder="Section title"
              className="bg-card font-medium"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeSection(i)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove section"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <TagInput
            value={section.items}
            onChange={(items) => updateSection(i, { items })}
            placeholder="Add topic"
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addSection}>
        <Plus className="h-4 w-4" />
        Add section
      </Button>
    </div>
  );
}
