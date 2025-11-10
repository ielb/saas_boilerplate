'use client';

import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Interactive Demo Preview Component
 * Video or interactive demo section
 */
export function DemoPreview() {
  return (
    <section className='py-24 bg-background' id='demo'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-12'>
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            See It In Action
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Watch a quick demo of the boilerplate in action
          </p>
        </div>
        <div className='max-w-4xl mx-auto'>
          <div className='relative aspect-video rounded-lg border bg-muted overflow-hidden'>
            <div className='absolute inset-0 flex items-center justify-center'>
              <Button size='lg' className='rounded-full h-20 w-20'>
                <Play className='h-10 w-10 ml-1' />
              </Button>
            </div>
            {/* Video placeholder - replace with actual video embed */}
            <div className='w-full h-full bg-gradient-to-br from-primary/20 to-primary/5' />
          </div>
        </div>
      </div>
    </section>
  );
}

