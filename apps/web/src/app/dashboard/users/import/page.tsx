'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { Upload, Download, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Bulk user import page with CSV upload and preview
 */
export default function BulkImportPage() {
  const [selectedFile, setSelectedFile] = useState<File[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: jobStatus, refetch } = useQuery({
    queryKey: ['bulk-import', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await usersService.getBulkImportStatus(jobId);
      return response as unknown as {
        id: string;
        status: string;
        total: number;
        processed: number;
        succeeded: number;
        failed: number;
        errors: Array<{ row: number; error: string }>;
      };
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Poll every 2 seconds if job is still processing
      return data?.status === 'processing' ? 2000 : false;
    },
  });

  const handleFileSelect = (files: File[]) => {
    setSelectedFile(files);
  };

  const handleUpload = async () => {
    if (selectedFile.length === 0) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsUploading(true);
    try {
      const response = await usersService.bulkImportUsers(selectedFile[0]);
      const result = response as unknown as { jobId: string; message: string };
      setJobId(result.jobId);
      toast.success('Import started successfully');
      refetch();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start import';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const progress =
    jobStatus && jobStatus.total > 0
      ? (jobStatus.processed / jobStatus.total) * 100
      : 0;

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <Button variant='ghost' asChild className='mb-4'>
          <Link href='/dashboard/users'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Users
          </Link>
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>Bulk Import Users</h1>
        <p className='text-muted-foreground mt-2'>
          Upload a CSV file to import multiple users at once.
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file with user data. Download the template for
              reference.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <FileUpload
              onFileSelect={handleFileSelect}
              accept='.csv'
              multiple={false}
            />
            <div className='flex gap-2'>
              <Button
                onClick={handleUpload}
                disabled={selectedFile.length === 0 || isUploading}
                className='flex-1'
              >
                {isUploading && <Loading size='sm' className='mr-2' />}
                <Upload className='mr-2 h-4 w-4' />
                Start Import
              </Button>
              <Button variant='outline' asChild>
                <a href='/templates/users-import.csv' download>
                  <Download className='mr-2 h-4 w-4' />
                  Download Template
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {jobStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Import Progress</CardTitle>
              <CardDescription>
                Track the progress of your bulk import operation.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span>Status</span>
                  <Badge
                    variant={
                      jobStatus.status === 'completed'
                        ? 'default'
                        : jobStatus.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {jobStatus.status.toUpperCase()}
                  </Badge>
                </div>
                <Progress value={progress} className='h-2' />
                <div className='flex items-center justify-between text-sm text-muted-foreground'>
                  <span>
                    {jobStatus.processed} of {jobStatus.total} processed
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 pt-4 border-t'>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='h-5 w-5 text-green-600' />
                  <div>
                    <div className='text-2xl font-bold'>{jobStatus.succeeded}</div>
                    <div className='text-xs text-muted-foreground'>Succeeded</div>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <XCircle className='h-5 w-5 text-red-600' />
                  <div>
                    <div className='text-2xl font-bold'>{jobStatus.failed}</div>
                    <div className='text-xs text-muted-foreground'>Failed</div>
                  </div>
                </div>
              </div>

              {jobStatus.errors.length > 0 && (
                <div className='pt-4 border-t'>
                  <div className='text-sm font-semibold mb-2'>Errors:</div>
                  <div className='max-h-40 overflow-y-auto space-y-1'>
                    {jobStatus.errors.map((error, index) => (
                      <div
                        key={index}
                        className='text-xs text-destructive bg-destructive/10 p-2 rounded'
                      >
                        Row {error.row}: {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


