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
  readOnlyOnEdit?: boolean;
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
  /**
   * Longest value the server will accept for this field.
   *
   * Purely a convenience: it stops an editor writing 6,000 characters into a
   * field the API caps at 300 and only finding out on save. The API rejects
   * an over-long value regardless of what this says, and nothing here is
   * relied upon for correctness.
   */
  maxLength?: number;
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
    /**
   * Converts a backend record into the values displayed by the form.
   */
  prepareEdit?: (record: T) => Record<string, unknown>;

  /**
   * Converts form values into the payload expected by the backend.
   */
  prepareSubmit?: (
    values: Record<string, unknown>,
    mode: 'create' | 'edit',
  ) => Record<string, unknown>;
  /** Width of the edit dialog. */
  dialogWide?: boolean;
}
