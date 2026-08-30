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
import { TagInput } from '@/components/TagInput';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { toast } from '@/components/ui/sonner';
import type { Settings, HeroSection } from '@/types';

export function HomeHeroPage() {
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

  const hero = form.heroSection ?? {};

  const set = (patch: Partial<Settings>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const setHero = (patch: Partial<HeroSection>) =>
    setForm((f) => (f ? { ...f, heroSection: { ...f.heroSection, ...patch } } : f));

  const setPrimaryCta = (patch: Partial<NonNullable<HeroSection['primaryCta']>>) =>
    setHero({ primaryCta: { ...hero.primaryCta, ...patch } });

  const setSecondaryCta = (patch: Partial<NonNullable<HeroSection['secondaryCta']>>) =>
    setHero({ secondaryCta: { ...hero.secondaryCta, ...patch } });

  const setOverlayCard = (patch: Partial<NonNullable<HeroSection['overlayCard']>>) =>
    setHero({ overlayCard: { ...hero.overlayCard, ...patch } });

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await apiPut('/settings', form);
      toast.success('Hero section saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Home Hero"
        description="Manage the hero section displayed at the top of the homepage."
        actions={
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl space-y-4">
        {/* Announcement Bar */}
        <Section
          title="Announcement Bar"
          description="The thin bar at the very top of the homepage. Leave empty to use the site default."
        >
          <Field label="Announcement text">
            <Input
              value={form.announcementText ?? ''}
              onChange={(e) => set({ announcementText: e.target.value })}
              placeholder="🎓 Next Batch Starting June 10 —"
            />
          </Field>
        </Section>

        {/* Promo Video */}
        <Section
          title="Promo Video"
          description="YouTube video shown on the homepage. Leave empty to use the site default video."
        >
          <Field label="YouTube URL">
            <Input
              value={form.homepageVideoUrl ?? ''}
              onChange={(e) => set({ homepageVideoUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX"
            />
          </Field>
        </Section>

        {/* Badge & Heading */}
        <Section title="Badge & Heading" description="Top badge label and the main hero heading.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Badge text" className="sm:col-span-2">
              <Input
                value={hero.badge ?? ''}
                onChange={(e) => setHero({ badge: e.target.value })}
                placeholder="Hyderabad's #1 IT Training Institute"
              />
            </Field>
            <Field label="Heading line 1">
              <Input
                value={hero.headingLine1 ?? ''}
                onChange={(e) => setHero({ headingLine1: e.target.value })}
                placeholder="Launch Your"
              />
            </Field>
            <Field label="Highlighted text">
              <Input
                value={hero.headingHighlight ?? ''}
                onChange={(e) => setHero({ headingHighlight: e.target.value })}
                placeholder="Tech Career"
              />
            </Field>
            <Field label="Heading line 2" className="sm:col-span-2">
              <Input
                value={hero.headingLine2 ?? ''}
                onChange={(e) => setHero({ headingLine2: e.target.value })}
                placeholder="with Hyderabad's Best Training"
              />
            </Field>
          </div>
        </Section>

        {/* Description */}
        <Section title="Description" description="The paragraph shown below the heading.">
          <Field label="Hero description">
            <Textarea
              value={hero.description ?? ''}
              onChange={(e) => setHero({ description: e.target.value })}
              rows={3}
              placeholder="Industry-aligned courses in Data Science, Gen AI, Python & Analytics…"
            />
          </Field>
        </Section>

        {/* Badges */}
        <Section title="Badges" description="Small labels shown below the description (e.g. '✅ 3000+ Students Placed').">
          <Field label="Badge items">
            <TagInput
              value={hero.badges ?? []}
              onChange={(badges) => setHero({ badges })}
              placeholder="Type a badge and press Enter"
            />
          </Field>
        </Section>

        {/* Call to Action */}
        <Section title="Call to Action" description="Hero buttons and WhatsApp link.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Primary button text">
              <Input
                value={hero.primaryCta?.text ?? ''}
                onChange={(e) => setPrimaryCta({ text: e.target.value })}
                placeholder="Book Free Demo"
              />
            </Field>
            <Field label="Primary button link">
              <Input
                value={hero.primaryCta?.link ?? ''}
                onChange={(e) => setPrimaryCta({ link: e.target.value })}
                placeholder="Leave empty to open demo modal"
              />
            </Field>
            <Field label="Secondary button text">
              <Input
                value={hero.secondaryCta?.text ?? ''}
                onChange={(e) => setSecondaryCta({ text: e.target.value })}
                placeholder="Explore Courses"
              />
            </Field>
            <Field label="Secondary button link">
              <Input
                value={hero.secondaryCta?.link ?? ''}
                onChange={(e) => setSecondaryCta({ link: e.target.value })}
                placeholder="/courses"
              />
            </Field>
            <Field label="WhatsApp button text" className="sm:col-span-2">
              <Input
                value={hero.whatsappText ?? ''}
                onChange={(e) => setHero({ whatsappText: e.target.value })}
                placeholder="WhatsApp Us"
              />
            </Field>
          </div>
        </Section>

        {/* Trust Points */}
        <Section title="Trust Points" description="Check-mark items shown below the buttons.">
          <Field label="Trust point items">
            <TagInput
              value={hero.trustPoints ?? []}
              onChange={(trustPoints) => setHero({ trustPoints })}
              placeholder="Type a trust point and press Enter"
            />
          </Field>
        </Section>

        {/* Hero Image */}
        <Section title="Hero Image" description="The main hero image. Uploaded to Cloudinary.">
          <div className="grid grid-cols-1 gap-4">
            <Field label="Hero image">
              <ImageUpload
                value={hero.heroImage}
                onChange={(url) => setHero({ heroImage: url })}
                folder="hero"
              />
            </Field>
            <Field label="Image alt text">
              <Input
                value={hero.heroImageAlt ?? ''}
                onChange={(e) => setHero({ heroImageAlt: e.target.value })}
                placeholder="GloryTecks IT training institute classroom…"
              />
            </Field>
          </div>
        </Section>

        {/* Floating Card */}
        <Section title="Floating Card" description="The overlay card shown on top of the hero image.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Label">
              <Input
                value={hero.overlayCard?.label ?? ''}
                onChange={(e) => setOverlayCard({ label: e.target.value })}
                placeholder="Average Salary Hike"
              />
            </Field>
            <Field label="Value">
              <Input
                value={hero.overlayCard?.value ?? ''}
                onChange={(e) => setOverlayCard({ value: e.target.value })}
                placeholder="3x — 5x"
              />
            </Field>
            <Field label="Suffix">
              <Input
                value={hero.overlayCard?.suffix ?? ''}
                onChange={(e) => setOverlayCard({ suffix: e.target.value })}
                placeholder="after course"
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
