import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

/**
 * Type-safe query options helper
 * Provides consistent error handling and typing
 */
export function createQueryOptions<TData, TError = AxiosError>(
  options: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
): Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  return options;
}

/**
 * Type-safe mutation options helper
 */
export function createMutationOptions<TData, TVariables, TError = AxiosError>(
  options: Omit<
    UseMutationOptions<TData, TError, TVariables>,
    'mutationFn'
  > = {}
): Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  return {
    ...options,
    onError: (error: TError, variables: TVariables, context: unknown) => {
      console.error('Mutation error:', error);
      options.onError?.(error, variables, context);
    },
  };
}

