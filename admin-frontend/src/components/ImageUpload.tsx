import { useRef } from 'react';
import { ImagePlus, Loader2, X, FileText } from 'lucide-react';
import { useUpload } from '@/hooks/useUpload';
import { Button } from '@/components/ui/button';
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
  const { upload, uploading } = useUpload();

  const handleFile = async (file?: File) => {
    if (!file) return;
    const url = await upload(file, kind, folder);
    if (url) onChange(url);
  };

  if (kind === 'document') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {value ? 'Replace file' : 'Upload file'}
        </Button>
        {value && (
          <a href={value} target="_blank" rel="noreferrer" className="truncate text-xs text-primary underline">
            View current
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-input bg-muted/40">
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
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
        <p className="text-xs text-muted-foreground">PNG, JPG or WebP. Stored on Cloudinary.</p>
      </div>
    </div>
  );
}
