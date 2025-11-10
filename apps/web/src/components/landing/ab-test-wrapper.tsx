'use client';

import { useState, useEffect } from 'react';

interface ABTestWrapperProps {
  children: React.ReactNode;
  variantA: React.ReactNode;
  variantB: React.ReactNode;
  testName: string;
}

/**
 * A/B Testing Wrapper Component
 * Enables A/B testing for CTAs and headlines
 */
export function ABTestWrapper({
  variantA,
  variantB,
  testName,
}: ABTestWrapperProps) {
  const [variant, setVariant] = useState<'A' | 'B'>('A');

  useEffect(() => {
    // Simple A/B test: 50/50 split based on localStorage
    const storedVariant = localStorage.getItem(`ab_test_${testName}`) as 'A' | 'B' | null;
    if (storedVariant) {
      setVariant(storedVariant);
    } else {
      // Randomly assign variant
      const newVariant = Math.random() < 0.5 ? 'A' : 'B';
      setVariant(newVariant);
      localStorage.setItem(`ab_test_${testName}`, newVariant);
    }
  }, [testName]);

  return <>{variant === 'A' ? variantA : variantB}</>;
}

