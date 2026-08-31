import { useRef } from 'react';
import { ImagePlus, Loader2, X, FileText } from 'lucide-react';
import { useUpload, formatBytes } from '@/hooks/useUpload';
import { Button } from '@/components/ui/button';
import { safeAssetUrl } from '@/lib/safeUrl';
import { cn } from '@/lib/utils';

interface UploadControlProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  kind?: 'image' | 'document';
  className?: string;
}

export function ImageUpload({ value, onChange, folder, kind = 'image', className }: UploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, policy } = useUpload();
  const limits = policy[kind];

  const handleFile = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    // Always clear the input, whatever the outcome. Without this the browser
    // keeps the old selection and re-picking the same file after a rejected
    // upload fires no change event at all — the control silently does nothing.
    const reset = () => {
      input.value = '';
    };

    if (!file) return reset();
    if (uploading) return reset();

    const url = await upload(file, kind, folder);
    reset();
    if (url) onChange(url);
  };

  // A stored URL is rendered as a link the admin can click. It reaches here
  // from the database, where another account may have written it, so the
  // scheme is checked before it becomes an href.
  const href = safeAssetUrl(value);

  if (kind === 'document') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <input
          ref={inputRef}
          type="file"
          accept={limits.accept}
          className="hidden"
          onChange={(e) => void handleFile(e.currentTarget)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {value ? 'Replace file' : 'Upload file'}
        </Button>
        {href && (
          <a href={href} target="_blank" rel="noreferrer noopener" className="truncate text-xs text-primary underline">
            View current
          </a>
        )}
        <span className="text-xs text-muted-foreground">
          {limits.formats.join(', ').toUpperCase()} · up to {formatBytes(limits.maxBytes)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={limits.accept}
        className="hidden"
        onChange={(e) => void handleFile(e.currentTarget)}
      />
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-input bg-muted/40">
        {href ? (
          <>
            <img src={href} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-1 top-1 rounded-full bg-foreground/70 p-0.5 text-background hover:bg-foreground"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1.5">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {value ? 'Replace' : 'Upload image'}
        </Button>
        <p className="text-xs text-muted-foreground">
          {limits.formats.join(', ').toUpperCase()} up to {formatBytes(limits.maxBytes)}. Stored on Cloudinary.
        </p>
      </div>
    </div>
  );
}
