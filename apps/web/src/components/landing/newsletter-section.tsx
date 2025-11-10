'use client';

import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { trackNewsletterSignup } from '@/lib/analytics';

/**
 * Newsletter Signup Section Component
 * Email capture for newsletter subscription
 */
export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement newsletter API call
      // await newsletterService.subscribe(email);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      trackNewsletterSignup();
      toast.success('Successfully subscribed to our newsletter!');
      setEmail('');
    } catch (error) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className='py-24 bg-gradient-to-r from-primary/5 to-primary/10'>
      <div className='container mx-auto px-4'>
        <div className='max-w-2xl mx-auto text-center'>
          <Mail className='h-12 w-12 text-primary mx-auto mb-4' />
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            Stay Updated
          </h2>
          <p className='text-xl text-muted-foreground mb-8'>
            Get the latest updates, new features, and tips delivered to your inbox
          </p>
          <form onSubmit={handleSubmit} className='flex flex-col sm:flex-row gap-4 max-w-md mx-auto'>
            <Input
              type='email'
              placeholder='Enter your email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className='flex-1'
            />
            <Button type='submit' disabled={isLoading} size='lg'>
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Subscribing...
                </>
              ) : (
                'Subscribe'
              )}
            </Button>
          </form>
          <p className='text-sm text-muted-foreground mt-4'>
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </section>
  );
}

