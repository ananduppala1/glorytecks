import type { LucideIcon } from 'lucide-react';
import type { Column } from '@/components/DataTable';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'email'
  | 'url'
  | 'switch'
  | 'select'
  | 'tags'
  | 'slug'
  | 'color'
  | 'image'
  | 'file'
  | 'salary'
  | 'objectlist';

export interface SubField {
  name: string;
  label: string;
  type?: 'text' | 'textarea';
  placeholder?: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  /** 1 = half width, 2 = full width (on sm+). */
  colSpan?: 1 | 2;
  options?: { label: string; value: string }[];
  /** For 'slug' — the field to derive from when empty. */
  slugFrom?: string;
  /** For 'objectlist' — schema of each repeatable row. */
  subFields?: SubField[];
  /** Default when creating. */
  defaultValue?: unknown;
  /** For 'image'/'file' — Cloudinary folder. */
  uploadFolder?: string;
  /** For 'file' — accepted document upload vs image. */
  accept?: 'image' | 'document';
}

export interface ResourceConfig<T extends { id: string } = { id: string }> {
  key: string;
  endpoint: string;
  singular: string;
  plural: string;
  description?: string;
  icon: LucideIcon;
  searchable?: boolean;
  defaultSort?: string;
  defaultOrder?: 'asc' | 'desc';
  columns: Column<T>[];
  fields: FieldDef[];
  /** Width of the edit dialog. */
  dialogWide?: boolean;
}
