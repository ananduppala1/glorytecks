import {
  Heading1,
  Heading2,
  Pilcrow,
  List,
  Table as TableIcon,
  Code2,
  Lightbulb,
  Quote,
  HelpCircle,
  Image as ImageIcon,
  LucideIcon,
} from 'lucide-react';
import type { Block, BlockType } from '@/types';

interface BlockMeta {
  type: BlockType;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const BLOCK_TYPES: BlockMeta[] = [
  { type: 'heading', label: 'Heading', description: 'Section heading (H2)', icon: Heading1 },
  { type: 'subheading', label: 'Subheading', description: 'Smaller heading (H3)', icon: Heading2 },
  { type: 'paragraph', label: 'Paragraph', description: 'Body text', icon: Pilcrow },
  { type: 'list', label: 'List', description: 'Bulleted or numbered', icon: List },
  { type: 'table', label: 'Table', description: 'Rows and columns', icon: TableIcon },
  { type: 'code', label: 'Code', description: 'Code snippet', icon: Code2 },
  { type: 'callout', label: 'Callout', description: 'Highlighted note', icon: Lightbulb },
  { type: 'quote', label: 'Quote', description: 'Blockquote', icon: Quote },
  { type: 'image', label: 'Image', description: 'Inline image', icon: ImageIcon },
  { type: 'faq', label: 'FAQ', description: 'Question & answer list', icon: HelpCircle },
];

export const BLOCK_META: Record<BlockType, BlockMeta> = Object.fromEntries(
  BLOCK_TYPES.map((b) => [b.type, b]),
) as Record<BlockType, BlockMeta>;

export function createBlock(type: BlockType): Block {
  switch (type) {
    case 'heading':
      return { type: 'heading', text: '' };
    case 'subheading':
      return { type: 'subheading', text: '' };
    case 'paragraph':
      return { type: 'paragraph', text: '' };
    case 'list':
      return { type: 'list', ordered: false, items: [''] };
    case 'table':
      return { type: 'table', head: ['Column 1', 'Column 2'], rows: [['', '']] };
    case 'code':
      return { type: 'code', lang: 'bash', code: '' };
    case 'callout':
      return { type: 'callout', variant: 'info', title: '', text: '' };
    case 'quote':
      return { type: 'quote', text: '', cite: '' };
    case 'image':
      return { type: 'image', url: '', alt: '', caption: '' };
    case 'faq':
      return { type: 'faq', items: [{ q: '', a: '' }] };
    default:
      return { type: 'paragraph', text: '' };
  }
}
