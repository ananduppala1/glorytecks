import { ChevronUp, ChevronDown, Trash2, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BLOCK_META } from './blockDefaults';
import { ImageUpload } from '@/components/ImageUpload';
import { cn } from '@/lib/utils';
import type { Block } from '@/types';

interface BlockCardProps {
  block: Block;
  index: number;
  total: number;
  onChange: (block: Block) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

export function BlockCard({ block, index, total, onChange, onRemove, onMove }: BlockCardProps) {
  const meta = BLOCK_META[block.type];
  const Icon = meta.icon;

  return (
    <div className="group rounded-lg border border-border bg-card shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {meta.label}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Delete block"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-3">
        <BlockBody block={block} onChange={onChange} />
      </div>
    </div>
  );
}

function BlockBody({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.type) {
    case 'heading':
    case 'subheading':
      return (
        <Input
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder={block.type === 'heading' ? 'Section heading' : 'Subheading'}
          className={cn(block.type === 'heading' ? 'text-base font-semibold' : 'font-medium')}
        />
      );

    case 'paragraph':
      return (
        <Textarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Write a paragraph. Use **bold**, *italic*, [links](url) and `code`."
          rows={3}
        />
      );

    case 'list':
      return <ListEditor block={block} onChange={onChange} />;

    case 'table':
      return <TableEditor block={block} onChange={onChange} />;

    case 'code':
      return (
        <div className="space-y-2">
          <Input
            value={block.lang ?? ''}
            onChange={(e) => onChange({ ...block, lang: e.target.value })}
            placeholder="Language (e.g. python, bash)"
            className="max-w-[200px] font-mono text-xs"
          />
          <Textarea
            value={block.code}
            onChange={(e) => onChange({ ...block, code: e.target.value })}
            placeholder="Paste code here"
            rows={5}
            className="font-mono text-[0.8125rem]"
          />
        </div>
      );

    case 'callout':
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select
              value={block.variant}
              onValueChange={(v) => onChange({ ...block, variant: v as typeof block.variant })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="tip">Tip</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={block.title ?? ''}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
              placeholder="Title (optional)"
            />
          </div>
          <Textarea
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Callout text"
            rows={2}
          />
        </div>
      );

    case 'quote':
      return (
        <div className="space-y-2">
          <Textarea
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Quote text"
            rows={2}
          />
          <Input
            value={block.cite ?? ''}
            onChange={(e) => onChange({ ...block, cite: e.target.value })}
            placeholder="Attribution (optional)"
          />
        </div>
      );

    case 'faq':
      return <FaqEditor block={block} onChange={onChange} />;

    case 'image':
      return (
        <div className="space-y-2">
          <ImageUpload
            value={block.url}
            onChange={(url) => onChange({ ...block, url })}
            folder="blog"
          />
          <Input
            value={block.alt ?? ''}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
            placeholder="Alt text (for accessibility & SEO)"
          />
          <Input
            value={block.caption ?? ''}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="Caption (optional)"
          />
        </div>
      );

    default:
      return null;
  }
}

/* ── List ──────────────────────────────────────────────────────────────── */
function ListEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'list' }>;
  onChange: (b: Block) => void;
}) {
  const setItem = (i: number, v: string) =>
    onChange({ ...block, items: block.items.map((it, idx) => (idx === i ? v : it)) });
  const addItem = () => onChange({ ...block, items: [...block.items, ''] });
  const removeItem = (i: number) =>
    onChange({ ...block, items: block.items.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Switch
          checked={Boolean(block.ordered)}
          onCheckedChange={(v) => onChange({ ...block, ordered: v })}
        />
        Numbered list
      </label>
      <div className="space-y-1.5">
        {block.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">
              {block.ordered ? `${i + 1}.` : '•'}
            </span>
            <Input
              value={item}
              onChange={(e) => setItem(i, e.target.value)}
              placeholder={`Item ${i + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeItem(i)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove item"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4" />
        Add item
      </Button>
    </div>
  );
}

/* ── Table ─────────────────────────────────────────────────────────────── */
function TableEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'table' }>;
  onChange: (b: Block) => void;
}) {
  const cols = block.head.length;

  const setHead = (i: number, v: string) =>
    onChange({ ...block, head: block.head.map((h, idx) => (idx === i ? v : h)) });

  const setCell = (r: number, c: number, v: string) =>
    onChange({
      ...block,
      rows: block.rows.map((row, ri) =>
        ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row,
      ),
    });

  const addColumn = () =>
    onChange({
      ...block,
      head: [...block.head, `Column ${cols + 1}`],
      rows: block.rows.map((row) => [...row, '']),
    });

  const removeColumn = (i: number) =>
    onChange({
      ...block,
      head: block.head.filter((_, idx) => idx !== i),
      rows: block.rows.map((row) => row.filter((_, idx) => idx !== i)),
    });

  const addRow = () => onChange({ ...block, rows: [...block.rows, Array(cols).fill('')] });
  const removeRow = (i: number) =>
    onChange({ ...block, rows: block.rows.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-2 overflow-x-auto">
      <div className="min-w-fit space-y-1.5">
        {/* Head */}
        <div className="flex items-center gap-1.5">
          {block.head.map((h, i) => (
            <div key={i} className="group/col relative">
              <Input
                value={h}
                onChange={(e) => setHead(i, e.target.value)}
                placeholder={`Head ${i + 1}`}
                className="w-36 bg-muted/40 font-medium"
              />
              {cols > 1 && (
                <button
                  type="button"
                  onClick={() => removeColumn(i)}
                  className="absolute -right-1 -top-1 hidden rounded-full bg-foreground/70 p-0.5 text-background group-hover/col:block"
                  aria-label="Remove column"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
          <Button type="button" variant="ghost" size="icon-sm" onClick={addColumn} aria-label="Add column">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {/* Rows */}
        {block.rows.map((row, r) => (
          <div key={r} className="flex items-center gap-1.5">
            {row.map((cell, c) => (
              <Input
                key={c}
                value={cell}
                onChange={(e) => setCell(r, c, e.target.value)}
                className="w-36"
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeRow(r)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove row"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4" />
        Add row
      </Button>
    </div>
  );
}

/* ── FAQ ───────────────────────────────────────────────────────────────── */
function FaqEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: 'faq' }>;
  onChange: (b: Block) => void;
}) {
  const setItem = (i: number, key: 'q' | 'a', v: string) =>
    onChange({
      ...block,
      items: block.items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)),
    });
  const addItem = () => onChange({ ...block, items: [...block.items, { q: '', a: '' }] });
  const removeItem = (i: number) =>
    onChange({ ...block, items: block.items.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-2">
      {block.items.map((item, i) => (
        <div key={i} className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2.5">
          <div className="flex items-center gap-2">
            <Input
              value={item.q}
              onChange={(e) => setItem(i, 'q', e.target.value)}
              placeholder="Question"
              className="bg-card font-medium"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeItem(i)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove FAQ"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={item.a}
            onChange={(e) => setItem(i, 'a', e.target.value)}
            placeholder="Answer"
            rows={2}
            className="bg-card"
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4" />
        Add question
      </Button>
    </div>
  );
}
