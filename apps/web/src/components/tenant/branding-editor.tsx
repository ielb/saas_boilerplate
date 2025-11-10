'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Palette } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Loading } from '@/components/ui/loading';

const brandingSchema = z.object({
  logo: z.string().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color')
    .optional()
    .or(z.literal('')),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color')
    .optional()
    .or(z.literal('')),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

/**
 * Tenant branding editor with logo upload and color picker
 */
export function BrandingEditor() {
  const { currentTenant, updateTenant, isLoading } = useTenant();
  const [logoFile, setLogoFile] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<BrandingFormValues>({
    // @ts-expect-error - zodResolver type compatibility issue
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logo: '',
      primaryColor: '',
      secondaryColor: '',
    },
  });

  // Load current branding
  useState(() => {
    if (currentTenant) {
      form.reset({
        logo: currentTenant.logo || '',
        primaryColor: currentTenant.primaryColor || '',
        secondaryColor: currentTenant.secondaryColor || '',
      });
    }
  });

  const handleFileSelect = (files: File[]) => {
    setLogoFile(files);
    if (files.length > 0) {
      // In a real app, you would upload the file first and get the URL
      // For now, we'll use a placeholder
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('logo', reader.result as string);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const onSubmit = async (values: BrandingFormValues) => {
    if (!currentTenant) return;

    setIsSaving(true);
    try {
      // TODO: Upload logo file if selected
      const updateData: any = {};
      if (values.primaryColor) updateData.primaryColor = values.primaryColor;
      if (values.secondaryColor)
        updateData.secondaryColor = values.secondaryColor;
      if (logoFile.length > 0) {
        // TODO: Upload logo and get URL
        // updateData.logo = uploadedLogoUrl;
      }

      await updateTenant(currentTenant.id, updateData);
      toast.success('Branding updated successfully');
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !currentTenant) {
    return <Loading />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Customize your organization's logo and color scheme.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Logo Upload */}
            <div>
              <FormLabel>Logo</FormLabel>
              <div className='mt-2'>
                {currentTenant?.logo && !logoFile.length && (
                  <div className='relative inline-block mb-4'>
                    <img
                      src={currentTenant.logo}
                      alt='Current logo'
                      className='h-20 w-20 object-contain rounded-lg border'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='absolute -top-2 -right-2 h-6 w-6 rounded-full'
                      onClick={() => {
                        form.setValue('logo', '');
                        setLogoFile([]);
                      }}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                )}
                <FileUpload
                  onFileSelect={handleFileSelect}
                  accept='image/*'
                  multiple={false}
                  maxSize={5 * 1024 * 1024} // 5MB
                />
              </div>
            </div>

            {/* Color Pickers */}
            <div className='grid gap-6 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='primaryColor'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-2'>
                      <Palette className='h-4 w-4' />
                      Primary Color
                    </FormLabel>
                    <FormControl>
                      <div className='flex gap-2'>
                        <Input
                          type='color'
                          className='w-20 h-10'
                          value={field.value || '#000000'}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        <Input
                          placeholder='#000000'
                          value={field.value || ''}
                          onChange={field.onChange}
                          className='flex-1'
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='secondaryColor'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-2'>
                      <Palette className='h-4 w-4' />
                      Secondary Color
                    </FormLabel>
                    <FormControl>
                      <div className='flex gap-2'>
                        <Input
                          type='color'
                          className='w-20 h-10'
                          value={field.value || '#000000'}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        <Input
                          placeholder='#000000'
                          value={field.value || ''}
                          onChange={field.onChange}
                          className='flex-1'
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='flex justify-end gap-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => form.reset()}
              >
                Reset
              </Button>
              <Button type='submit' disabled={isSaving}>
                {isSaving && <Loading size='sm' className='mr-2' />}
                <Save className='mr-2 h-4 w-4' />
                Save Branding
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


