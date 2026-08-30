import { useEffect } from 'react';
import { useForm, Controller, DefaultValues } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
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
import { cn, slugify } from '@/lib/utils';
import type { FieldDef } from '@/features/formTypes';

interface ResourceFormProps<T extends Record<string, unknown>> {
  fields: FieldDef[];
  defaultValues: DefaultValues<T>;
  onSubmit: (values: T) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
}

export function ResourceForm<T extends Record<string, unknown>>({
  fields,
  defaultValues,
  onSubmit,
  submitting,
  submitLabel = 'Save',
  onCancel,
}: ResourceFormProps<T>) {
  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<T>({ defaultValues });

  useEffect(() => {
    reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(v))}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        {fields.map((f) => {
          const error = (errors as Record<string, { message?: string }>)[f.name]?.message;
          const span = (f.colSpan ?? 2) === 2 ? 'sm:col-span-2' : 'sm:col-span-1';

          return (
            <Field
              key={f.name}
              label={f.label}
              htmlFor={f.name}
              required={f.required}
              error={error}
              hint={f.hint}
              className={cn(span)}
            >
              {renderControl(f)}
            </Field>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting} disabled={submitting || !isDirty}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );

  function renderControl(f: FieldDef) {
    const name = f.name as never;

    switch (f.type) {
      case 'textarea':
      case 'richtext':
        return (
          <Textarea
            id={f.name}
            rows={f.type === 'richtext' ? 8 : 3}
            placeholder={f.placeholder}
            {...register(name, { required: f.required && `${f.label} is required` })}
          />
        );

      case 'number':
        return (
          <Input
            id={f.name}
            type="number"
            placeholder={f.placeholder}
            {...register(name, {
              required: f.required && `${f.label} is required`,
              valueAsNumber: true,
            })}
          />
        );

      case 'switch':
        return (
          <Controller
            control={control}
            name={name}
            render={({ field }) => (
              <div className="flex h-9 items-center">
                <Switch
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                  id={f.name}
                />
              </div>
            )}
          />
        );

      case 'select':
        return (
          <Controller
            control={control}
            name={name}
            rules={{ required: f.required && `${f.label} is required` }}
            render={({ field }) => (
              <Select value={(field.value as string) ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id={f.name}>
                  <SelectValue placeholder={f.placeholder ?? 'Select…'} />
                </SelectTrigger>
                <SelectContent>
                  {(f.options ?? []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        );

      case 'tags':
        return (
          <Controller
            control={control}
            name={name}
            render={({ field }) => (
              <TagInput
                value={(field.value as string[]) ?? []}
                onChange={field.onChange}
                placeholder={f.placeholder}
              />
            )}
          />
        );

      case 'slug':
        return (
          <div className="flex gap-2">
            <Input
              id={f.name}
              placeholder={f.placeholder ?? 'auto-generated'}
              className="font-mono text-[0.8125rem]"
              {...register(name)}
            />
            {f.slugFrom && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const src = watch(f.slugFrom as never) as unknown as string;
                  if (src) setValue(name, slugify(src) as never, { shouldDirty: true });
                }}
              >
                Generate
              </Button>
            )}
          </div>
        );

      case 'color':
        return (
          <Controller
            control={control}
            name={name}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Input
                  id={f.name}
                  placeholder={f.placeholder ?? 'e.g. 217 91% 60%'}
                  value={(field.value as string) ?? ''}
                  onChange={field.onChange}
                  className="font-mono text-[0.8125rem]"
                />
                <span
                  className="h-9 w-9 shrink-0 rounded-md border border-border"
                  style={{ background: hslPreview(field.value as string) }}
                />
              </div>
            )}
          />
        );

      case 'image':
      case 'file':
        return (
          <Controller
            control={control}
            name={name}
            render={({ field }) => (
              <ImageUpload
                value={(field.value as string) ?? ''}
                onChange={field.onChange}
                folder={f.uploadFolder}
                kind={f.type === 'file' ? 'document' : 'image'}
              />
            )}
          />
        );

      case 'salary':
        return (
          <Controller
            control={control}
            name={name}
            render={({ field }) => {
              const val = (field.value as Record<string, string>) ?? {};
              const set = (k: string, v: string) => field.onChange({ ...val, [k]: v });
              return (
                <div className="grid grid-cols-3 gap-2">
                  {(['fresher', 'mid', 'senior'] as const).map((k) => (
                    <Input
                      key={k}
                      placeholder={k}
                      value={val[k] ?? ''}
                      onChange={(e) => set(k, e.target.value)}
                    />
                  ))}
                </div>
              );
            }}
          />
        );

      case 'objectlist':
        return (
          <Controller
            control={control}
            name={name}
            render={({ field }) => (
              <ObjectListInput
                value={(field.value as Record<string, string>[]) ?? []}
                onChange={field.onChange}
                subFields={f.subFields ?? []}
              />
            )}
          />
        );

      case 'email':
      case 'url':
      case 'text':
      default:
        return (
          <Input
            id={f.name}
            type={f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'}
            placeholder={f.placeholder}
            {...register(name, { required: f.required && `${f.label} is required` })}
          />
        );
    }
  }
}

function hslPreview(value?: string): string {
  if (!value) return 'hsl(220 16% 91%)';
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) return value;
  return `hsl(${value})`;
}
