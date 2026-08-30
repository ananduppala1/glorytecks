import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Plus, Trash2, ChevronUp, ChevronDown, ArrowLeftRight } from 'lucide-react';
import { apiGet, apiPut, getErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/Field';
import { ImageUpload } from '@/components/ImageUpload';
import { TagInput } from '@/components/TagInput';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { toast } from '@/components/ui/sonner';
import type { AboutPage, AboutHero, AboutSection, AboutStat, AboutCta } from '@/types';

export function AboutPageEditor() {
  const [form, setForm] = useState<AboutPage | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<AboutPage>({
    queryKey: ['about'],
    queryFn: async () => (await apiGet<AboutPage>('/about')).data,
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) return <FullScreenLoader />;

  const hero = form.hero ?? {};
  const sections = form.sections ?? [];
  const stats = form.stats ?? [];
  const cta = form.cta ?? {};

  const setHero = (patch: Partial<AboutHero>) =>
    setForm((f) => (f ? { ...f, hero: { ...f.hero, ...patch } } : f));
  const setCta = (patch: Partial<AboutCta>) =>
    setForm((f) => (f ? { ...f, cta: { ...f.cta, ...patch } } : f));

  const setSection = (index: number, patch: Partial<AboutSection>) =>
    setForm((f) =>
      f
        ? {
            ...f,
            sections: (f.sections ?? []).map((s, i) => (i === index ? { ...s, ...patch } : s)),
          }
        : f,
    );
  const addSection = () =>
    setForm((f) =>
      f
        ? {
            ...f,
            sections: [
              ...(f.sections ?? []),
              {
                eyebrow: '',
                heading: '',
                body: '',
                bullets: [],
                image: '',
                imageAlt: '',
                // Alternate the layout automatically for the new section.
                imageSide: (f.sections ?? []).length % 2 === 0 ? 'left' : 'right',
              },
            ],
          }
        : f,
    );
  const removeSection = (index: number) =>
    setForm((f) => (f ? { ...f, sections: (f.sections ?? []).filter((_, i) => i !== index) } : f));
  const moveSection = (index: number, dir: -1 | 1) =>
    setForm((f) => {
      if (!f) return f;
      const arr = [...(f.sections ?? [])];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return f;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return { ...f, sections: arr };
    });

  const setStat = (index: number, patch: Partial<AboutStat>) =>
    setForm((f) =>
      f ? { ...f, stats: (f.stats ?? []).map((s, i) => (i === index ? { ...s, ...patch } : s)) } : f,
    );
  const addStat = () =>
    setForm((f) => (f ? { ...f, stats: [...(f.stats ?? []), { value: '', label: '', icon: '' }] } : f));
  const removeStat = (index: number) =>
    setForm((f) => (f ? { ...f, stats: (f.stats ?? []).filter((_, i) => i !== index) } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await apiPut('/about', form);
      toast.success('About page saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="About Us"
        description="Manage the content shown on the public About page."
        actions={
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl space-y-4">
        {/* Hero */}
        <Section title="Hero" description="The top section of the About page.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Eyebrow / badge" className="sm:col-span-2">
              <Input
                value={hero.badge ?? ''}
                onChange={(e) => setHero({ badge: e.target.value })}
                placeholder="About GloryTecks"
              />
            </Field>
            <Field label="Heading" className="sm:col-span-2">
              <Textarea
                value={hero.heading ?? ''}
                onChange={(e) => setHero({ heading: e.target.value })}
                rows={2}
                placeholder="Shaping Careers. Building Futures."
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                value={hero.description ?? ''}
                onChange={(e) => setHero({ description: e.target.value })}
                rows={3}
              />
            </Field>
            <Field label="Hero image" className="sm:col-span-2">
              <ImageUpload
                value={hero.image}
                onChange={(url) => setHero({ image: url })}
                folder="about"
              />
            </Field>
            <Field label="Image alt text" className="sm:col-span-2">
              <Input
                value={hero.imageAlt ?? ''}
                onChange={(e) => setHero({ imageAlt: e.target.value })}
              />
            </Field>
            <Field label="Primary button text">
              <Input
                value={hero.primaryCtaText ?? ''}
                onChange={(e) => setHero({ primaryCtaText: e.target.value })}
                placeholder="Explore Courses"
              />
            </Field>
            <Field label="Primary button link">
              <Input
                value={hero.primaryCtaLink ?? ''}
                onChange={(e) => setHero({ primaryCtaLink: e.target.value })}
                placeholder="/courses"
              />
            </Field>
            <Field label="Secondary button text">
              <Input
                value={hero.secondaryCtaText ?? ''}
                onChange={(e) => setHero({ secondaryCtaText: e.target.value })}
                placeholder="Talk to Counselor"
              />
            </Field>
            <Field label="Secondary button link">
              <Input
                value={hero.secondaryCtaLink ?? ''}
                onChange={(e) => setHero({ secondaryCtaLink: e.target.value })}
                placeholder="/contact"
              />
            </Field>
          </div>
        </Section>

        {/* Content sections */}
        <Section
          title="Content Sections"
          description="Alternating content/image sections. Use the layout toggle to place the image on the left or right."
        >
          <div className="space-y-4">
            {sections.map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Section {i + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSection(i, { imageSide: s.imageSide === 'left' ? 'right' : 'left' })
                      }
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Image: {s.imageSide === 'right' ? 'Right' : 'Left'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={i === 0}
                      onClick={() => moveSection(i, -1)}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={i === sections.length - 1}
                      onClick={() => moveSection(i, 1)}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
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
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Eyebrow">
                    <Input
                      value={s.eyebrow ?? ''}
                      onChange={(e) => setSection(i, { eyebrow: e.target.value })}
                      placeholder="Who We Are"
                    />
                  </Field>
                  <Field label="Heading">
                    <Input
                      value={s.heading ?? ''}
                      onChange={(e) => setSection(i, { heading: e.target.value })}
                      placeholder="Learn From Industry Experts"
                    />
                  </Field>
                  <Field label="Body" className="sm:col-span-2">
                    <Textarea
                      value={s.body ?? ''}
                      onChange={(e) => setSection(i, { body: e.target.value })}
                      rows={3}
                    />
                  </Field>
                  <Field label="Checklist items" className="sm:col-span-2">
                    <TagInput
                      value={s.bullets ?? []}
                      onChange={(bullets) => setSection(i, { bullets })}
                      placeholder="Type an item and press Enter"
                    />
                  </Field>
                  <Field label="Image" className="sm:col-span-2">
                    <ImageUpload
                      value={s.image}
                      onChange={(url) => setSection(i, { image: url })}
                      folder="about"
                    />
                  </Field>
                  <Field label="Image alt text" className="sm:col-span-2">
                    <Input
                      value={s.imageAlt ?? ''}
                      onChange={(e) => setSection(i, { imageAlt: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addSection}>
              <Plus className="h-4 w-4" />
              Add section
            </Button>
          </div>
        </Section>

        {/* Stats */}
        <Section title="Stats" description="The highlight numbers shown between the sections.">
          <div className="space-y-2">
            {stats.map((s, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field label="Value" className="flex-1">
                  <Input
                    value={s.value ?? ''}
                    onChange={(e) => setStat(i, { value: e.target.value })}
                    placeholder="3000+"
                  />
                </Field>
                <Field label="Label" className="flex-[2]">
                  <Input
                    value={s.label ?? ''}
                    onChange={(e) => setStat(i, { label: e.target.value })}
                    placeholder="Students Trained"
                  />
                </Field>
                <Field label="Icon" className="flex-1">
                  <Input
                    value={s.icon ?? ''}
                    onChange={(e) => setStat(i, { icon: e.target.value })}
                    placeholder="Users"
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStat(i)}
                  className="mb-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove stat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addStat}>
              <Plus className="h-4 w-4" />
              Add stat
            </Button>
          </div>
        </Section>

        {/* CTA */}
        <Section title="Call to Action" description="The banner shown at the bottom of the page.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Heading" className="sm:col-span-2">
              <Input value={cta.heading ?? ''} onChange={(e) => setCta({ heading: e.target.value })} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                value={cta.description ?? ''}
                onChange={(e) => setCta({ description: e.target.value })}
                rows={2}
              />
            </Field>
            <Field label="Button text">
              <Input
                value={cta.buttonText ?? ''}
                onChange={(e) => setCta({ buttonText: e.target.value })}
                placeholder="Get Started"
              />
            </Field>
            <Field label="Button link">
              <Input
                value={cta.buttonLink ?? ''}
                onChange={(e) => setCta({ buttonLink: e.target.value })}
                placeholder="/contact"
              />
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
