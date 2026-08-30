import { useState } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

interface UploadResult {
  url: string;
  publicId: string;
}

/** Upload a file to the backend (which streams it to Cloudinary) and return its URL. */
export function useUpload() {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File, kind: 'image' | 'document', folder?: string): Promise<string | null> {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (folder) form.append('folder', folder);
      const endpoint = kind === 'image' ? '/uploads/image' : '/uploads/document';
      const res = await api.post<{ data: UploadResult }>(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data.url;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload failed'));
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading };
}
