import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, UseFormProps } from 'react-hook-form';
import type { z } from 'zod';

/**
 * Create form configuration with Zod validation
 * @param schema - Zod schema for validation
 * @param options - Additional form options
 * @returns Form configuration
 */
export function createFormConfig<TFieldValues extends FieldValues>(
  schema: z.ZodType<TFieldValues>,
  options?: Omit<UseFormProps<TFieldValues>, 'resolver'>
): UseFormProps<TFieldValues> {
  return {
    // @ts-expect-error - zodResolver type compatibility issue with strict mode
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    ...options,
  };
}

