import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Save,
  Settings2,
  Search,
  ChevronDown,
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field } from '@/components/Field';
import { TagInput } from '@/components/TagInput';
import { ImageUpload } from '@/components/ImageUpload';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { EmptyState } from '@/components/EmptyState';
import { BlockCard } from '@/components/blocks/BlockCard';
import { BLOCK_TYPES, createBlock } from '@/components/blocks/blockDefaults';
import { toast } from '@/components/ui/sonner';
import { slugify } from '@/lib/utils';
import type { Block, BlogCategory, Author, Blog, BlogKind, ContentStatus } from '@/types';

const KIND_OPTIONS: { label: string; value: BlogKind }[] = [
  { label: 'Guide', value: 'guide' },
  { label: 'What is', value: 'whatis' },
  { label: 'Comparison', value: 'comparison' },
  { label: 'Roadmap', value: 'roadmap' },
  { label: 'Salary', value: 'salary' },
  { label: 'Interview', value: 'interview' },
  { label: 'Projects', value: 'projects' },
  { label: 'Certification', value: 'certification' },
];

interface BlogDraft {
  title: string;
  slug: string;
  category: string;
  categorySlug: string;
  kind: BlogKind;
  excerpt: string;
  authorKey: string;
  tags: string[];
  featured: boolean;
  trending: boolean;
  popular: boolean;
  status: ContentStatus;
  featuredImage: string;
  content: Block[];
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
}

const EMPTY_DRAFT: BlogDraft = {
  title: '',
  slug: '',
  category: '',
  categorySlug: '',
  kind: 'guide',
  excerpt: '',
  authorKey: '',
  tags: [],
  featured: false,
  trending: false,
  popular: false,
  status: 'draft',
  featuredImage: '',
  content: [],
  seo: {},
};

export function BlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [draft, setDraft] = useState<BlogDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [seoOpen, setSeoOpen] = useState(false);

  const detailQuery = useQuery<Blog>({
    queryKey: ['blogs', 'detail', id],
    queryFn: async () => (await apiGet<Blog>(`/blogs/${id}`)).data,
    enabled: !isNew,
  });

  const { data: categories } = useQuery<BlogCategory[]>({
    queryKey: ['categories', 'all'],
    queryFn: async () => (await apiGet<BlogCategory[]>('/categories?limit=100&sort=name&order=asc')).data,
  });
  const { data: authors } = useQuery<Author[]>({
    queryKey: ['authors', 'all'],
    queryFn: async () => (await apiGet<Author[]>('/authors?limit=100&sort=name&order=asc')).data,
  });

  // Hydrate the draft once the post loads.
  useEffect(() => {
    if (detailQuery.data) {
      const b = detailQuery.data;
      const authorKey =
        b.authorKey ?? (typeof b.author === 'object' && b.author ? b.author.key : '') ?? '';
      setDraft({
        title: b.title ?? '',
        slug: b.slug ?? '',
        category: b.category ?? '',
        categorySlug: b.categorySlug ?? '',
        kind: b.kind ?? 'guide',
        excerpt: b.excerpt ?? '',
        authorKey,
        tags: b.tags ?? [],
        featured: Boolean(b.featured),
        trending: Boolean(b.trending),
        popular: Boolean(b.popular),
        status: b.status ?? 'draft',
        featuredImage: b.featuredImage ?? '',
        content: (b.content as Block[]) ?? [],
        seo: {
          metaTitle: b.seo?.metaTitle,
          metaDescription: b.seo?.metaDescription,
          keywords: b.seo?.keywords ?? [],
        },
      });
    }
  }, [detailQuery.data]);

  const set = <K extends keyof BlogDraft>(key: K, value: BlogDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  /* ── Block operations ─────────────────────────────────────────────── */
  const addBlock = (type: Block['type']) => set('content', [...draft.content, createBlock(type)]);
  const updateBlock = (index: number, block: Block) =>
    set('content', draft.content.map((b, i) => (i === index ? block : b)));
  const removeBlock = (index: number) =>
    set('content', draft.content.filter((_, i) => i !== index));
  const moveBlock = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draft.content.length) return;
    const next = [...draft.content];
    [next[index], next[target]] = [next[target], next[index]];
    set('content', next);
  };

  const onPickCategory = (slug: string) => {
    const cat = categories?.find((c) => c.slug === slug);
    setDraft((d) => ({ ...d, categorySlug: slug, category: cat?.name ?? d.category }));
  };

  const canSave = draft.title.trim() && draft.categorySlug && draft.content.length > 0;

  const handleSave = async () => {
    if (!canSave) {
      toast.error('Add a title, category and at least one content block.');
      return;
    }
    setSaving(true);
    const payload = {
      ...draft,
      slug: draft.slug || slugify(draft.title),
    };
    try {
      if (isNew) {
        const res = await apiPost<Blog>('/blogs', payload);
        toast.success('Post created');
        navigate(`/blogs/${res.data.id}`, { replace: true });
      } else {
        await apiPut<Blog>(`/blogs/${id}`, payload);
        toast.success('Post saved');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = useMemo(
    () => (categories ?? []).map((c) => ({ label: c.name, value: c.slug })),
    [categories],
  );

  if (!isNew && detailQuery.isLoading) return <FullScreenLoader />;

  return (
    <div className="-mx-4 -my-6 lg:-mx-8 lg:-my-8">
      {/* Sticky editor header */}
      <div className="sticky top-14 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md lg:px-8">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/blogs')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {draft.title || (isNew ? 'New post' : 'Untitled post')}
          </p>
          <p className="text-xs text-muted-foreground">{isNew ? 'Draft' : `Editing · ${draft.status}`}</p>
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
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowSettings((s) => !s)}
          aria-label="Toggle settings"
          className="lg:hidden"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_340px] lg:px-8">
        {/* Editor column */}
        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-xs">
            <Input
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Post title"
              className="border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
            />
            <Textarea
              value={draft.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              placeholder="Short excerpt shown in listings and search results…"
              rows={2}
              className="resize-none border-0 px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
            />
          </div>

          {draft.content.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card">
              <EmptyState
                icon={Plus}
                title="Start writing"
                description="Add your first content block to build the article."
                action={<AddBlockMenu onAdd={addBlock} />}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {draft.content.map((block, i) => (
                <BlockCard
                  key={i}
                  block={block}
                  index={i}
                  total={draft.content.length}
                  onChange={(b) => updateBlock(i, b)}
                  onRemove={() => removeBlock(i)}
                  onMove={(dir) => moveBlock(i, dir)}
                />
              ))}
              <div className="flex justify-center pt-1">
                <AddBlockMenu onAdd={addBlock} />
              </div>
            </div>
          )}
        </div>

        {/* Settings rail */}
        <aside className={showSettings ? 'block' : 'hidden lg:block'}>
          <div className="space-y-4 lg:sticky lg:top-32">
            <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-xs">
              <h3 className="text-sm font-semibold">Post settings</h3>

              <Field label="Slug" htmlFor="slug" hint="Used in the post URL">
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={draft.slug}
                    onChange={(e) => set('slug', e.target.value)}
                    placeholder="auto-from-title"
                    className="font-mono text-[0.8125rem]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => set('slug', slugify(draft.title))}
                  >
                    Auto
                  </Button>
                </div>
              </Field>

              <Field label="Category" required>
                <Select value={draft.categorySlug} onValueChange={onPickCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Post type">
                <Select value={draft.kind} onValueChange={(v) => set('kind', v as BlogKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KIND_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Author">
                <Select value={draft.authorKey} onValueChange={(v) => set('authorKey', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select author" />
                  </SelectTrigger>
                  <SelectContent>
                    {(authors ?? []).map((a) => (
                      <SelectItem key={a.key} value={a.key}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Tags">
                <TagInput value={draft.tags} onChange={(v) => set('tags', v)} placeholder="Add tag" />
              </Field>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-xs">
              <h3 className="text-sm font-semibold">Visibility</h3>
              <ToggleRow label="Featured" checked={draft.featured} onChange={(v) => set('featured', v)} />
              <ToggleRow label="Trending" checked={draft.trending} onChange={(v) => set('trending', v)} />
              <ToggleRow label="Popular" checked={draft.popular} onChange={(v) => set('popular', v)} />
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-xs">
              <h3 className="text-sm font-semibold">Featured image</h3>
              <ImageUpload
                value={draft.featuredImage}
                onChange={(url) => set('featuredImage', url)}
                folder="blog"
              />
            </div>

            <div className="rounded-lg border border-border bg-card shadow-xs">
              <button
                type="button"
                onClick={() => setSeoOpen((o) => !o)}
                className="flex w-full items-center justify-between p-4"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  SEO
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${seoOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {seoOpen && (
                <div className="space-y-3 border-t border-border p-4">
                  <Field label="Meta title">
                    <Input
                      value={draft.seo.metaTitle ?? ''}
                      onChange={(e) => set('seo', { ...draft.seo, metaTitle: e.target.value })}
                      placeholder={draft.title}
                    />
                  </Field>
                  <Field label="Meta description">
                    <Textarea
                      value={draft.seo.metaDescription ?? ''}
                      onChange={(e) => set('seo', { ...draft.seo, metaDescription: e.target.value })}
                      rows={3}
                      placeholder={draft.excerpt}
                    />
                  </Field>
                  <Field label="Keywords">
                    <TagInput
                      value={draft.seo.keywords ?? []}
                      onChange={(v) => set('seo', { ...draft.seo, keywords: v })}
                      placeholder="Add keyword"
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function AddBlockMenu({ onAdd }: { onAdd: (type: Block['type']) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          Add block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-60">
        {BLOCK_TYPES.map((b) => {
          const Icon = b.icon;
          return (
            <DropdownMenuItem key={b.type} onClick={() => onAdd(b.type)} className="gap-2.5 py-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium">{b.label}</div>
                <div className="text-xs text-muted-foreground">{b.description}</div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

