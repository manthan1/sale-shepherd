// src/components/FileUpload.tsx (Updated)

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, X } from 'lucide-react';

interface FileUploadProps {
  label: string;
  description: string;
  accept: string;
  buttonText: string;
  onFileSelect: (file: File) => void;
  currentImageUrl?: string | null; // <-- Prop to show the existing image
  isUploading?: boolean; // <-- Prop to show a loading state
}

export const FileUpload = ({
  label,
  description,
  accept,
  buttonText,
  onFileSelect,
  currentImageUrl,
  isUploading = false,
}: FileUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      onFileSelect(file);
    }
  };

  const displayUrl = previewUrl || currentImageUrl;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {displayUrl ? (
          <div className="relative w-24 h-24 rounded-md overflow-hidden border">
            <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
              {isUploading && <p className="text-white text-xs">Uploading...</p>}
            </div>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted">
            <UploadCloud className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">
          <Input id={label} type="file" accept={accept} onChange={handleFileChange} className="hidden" />
          <Button type="button" variant="outline" onClick={() => document.getElementById(label)?.click()} disabled={isUploading}>
            {isUploading ? 'Uploading...' : buttonText}
          </Button>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
};