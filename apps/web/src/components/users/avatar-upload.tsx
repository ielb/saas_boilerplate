'use client';

import { useState, useRef } from 'react';
import { Upload, X, Crop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  currentAvatar?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  className?: string;
  disabled?: boolean;
}

/**
 * Avatar upload component with image cropping and preview
 */
export function AvatarUpload({
  currentAvatar,
  onUpload,
  onRemove,
  className,
  disabled,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCrop = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await onUpload(selectedFile);
      setShowCropDialog(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;

    setIsUploading(true);
    try {
      await onRemove();
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to remove avatar:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const userInitials = 'U';

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <Avatar className='h-32 w-32'>
        <AvatarImage src={preview || undefined} alt='Avatar' />
        <AvatarFallback className='text-3xl'>{userInitials}</AvatarFallback>
      </Avatar>

      <div className='flex gap-2'>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleFileSelect}
          className='hidden'
          disabled={disabled || isUploading}
          id='avatar-upload'
        />
        <Button
          variant='outline'
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          asChild
        >
          <label htmlFor='avatar-upload' className='cursor-pointer'>
            <Upload className='mr-2 h-4 w-4' />
            {preview ? 'Change' : 'Upload'} Avatar
          </label>
        </Button>
        {preview && onRemove && (
          <Button
            variant='outline'
            onClick={handleRemove}
            disabled={disabled || isUploading}
          >
            <X className='mr-2 h-4 w-4' />
            Remove
          </Button>
        )}
      </div>

      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Crop Avatar</DialogTitle>
            <DialogDescription>
              Adjust and crop your avatar image. Click save when done.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            {preview && (
              <div className='relative w-full aspect-square rounded-lg overflow-hidden border'>
                <img
                  src={preview}
                  alt='Preview'
                  className='w-full h-full object-contain'
                />
                {/* TODO: Add actual cropping functionality with a library like react-easy-crop */}
              </div>
            )}
            <div className='flex justify-end gap-2'>
              <Button
                variant='outline'
                onClick={() => {
                  setShowCropDialog(false);
                  setSelectedFile(null);
                  setPreview(currentAvatar || null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCrop} disabled={isUploading}>
                {isUploading && <Loading size='sm' className='mr-2' />}
                <Crop className='mr-2 h-4 w-4' />
                Save Avatar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


