'use client';

import { useCallback, useState } from 'react';
import { Upload, X, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  className?: string;
  disabled?: boolean;
}

/**
 * File upload component with drag-and-drop support
 */
export function FileUpload({
  onFileSelect,
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  className,
  disabled,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    if (file.size > maxSize) {
      setError(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(validateFile);

      if (validFiles.length > 0) {
        const newFiles = multiple ? [...selectedFiles, ...validFiles] : validFiles;
        setSelectedFiles(newFiles);
        onFileSelect(newFiles);
      }
    },
    [selectedFiles, multiple, maxSize, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      handleFiles(files);
    },
    [disabled, handleFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(newFiles);
      onFileSelect(newFiles);
    },
    [selectedFiles, onFileSelect]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer hover:border-primary/50'
        )}
      >
        <input
          type='file'
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className='absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed'
          disabled={disabled}
        />
        <Upload className='mb-4 h-10 w-10 text-muted-foreground' />
        <p className='mb-2 text-sm font-medium'>
          {isDragging ? 'Drop files here' : 'Drag and drop files here'}
        </p>
        <p className='text-xs text-muted-foreground'>
          or click to browse
        </p>
        {maxSize && (
          <p className='mt-2 text-xs text-muted-foreground'>
            Max file size: {formatFileSize(maxSize)}
          </p>
        )}
      </div>

      {error && (
        <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
          {error}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className='space-y-2'>
          <h4 className='text-sm font-medium'>Selected Files:</h4>
          <div className='space-y-2'>
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className='flex items-center justify-between rounded-md border bg-card p-3'
              >
                <div className='flex items-center gap-3'>
                  <File className='h-5 w-5 text-muted-foreground' />
                  <div>
                    <p className='text-sm font-medium'>{file.name}</p>
                    <p className='text-xs text-muted-foreground'>{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


