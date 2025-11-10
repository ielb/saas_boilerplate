'use client';

import { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  highlights: string[];
}

/**
 * Interactive Feature Card Component
 * Reusable feature card with hover effects
 */
export function FeatureCard({ icon, title, description, highlights }: FeatureCardProps) {
  return (
    <div className='group relative rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-lg hover:border-primary/50'>
      <div className='flex items-start gap-4'>
        <div className='flex-shrink-0 rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary/20 transition-colors'>
          {icon}
        </div>
        <div className='flex-1'>
          <h3 className='text-xl font-semibold mb-2'>{title}</h3>
          <p className='text-muted-foreground mb-4'>{description}</p>
          <ul className='space-y-2'>
            {highlights.map((highlight, idx) => (
              <li key={idx} className='flex items-start gap-2 text-sm'>
                <CheckCircle2 className='h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

