'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AvatarUpload } from '@/components/users/avatar-upload';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

/**
 * Avatar upload page
 */
export default function AvatarPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // TODO: Upload file to server and get URL
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await filesService.uploadAvatar(formData);
      // await usersService.updateUser(user.id, { avatar: response.url });
      
      // Simulate upload
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Avatar uploaded successfully');
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload avatar';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      // TODO: Remove avatar via API
      // await usersService.updateUser(user.id, { avatar: null });
      
      toast.success('Avatar removed successfully');
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to remove avatar';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>Avatar</h1>
        <p className='text-muted-foreground mt-2'>
          Upload and manage your profile picture.
        </p>
      </div>

      <Card className='max-w-2xl mx-auto'>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Upload a new avatar image. Recommended size: 400x400 pixels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            currentAvatar={user?.avatar}
            onUpload={handleUpload}
            onRemove={handleRemove}
            disabled={isUploading}
          />
        </CardContent>
      </Card>
    </div>
  );
}


