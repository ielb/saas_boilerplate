import { create, type StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Create a store with devtools and persistence support
 * @param name - Store name for devtools and persistence
 * @param storeCreator - Store creator function
 * @param options - Store options
 * @returns Zustand store
 */
export function createStore<T extends object>(
  name: string,
  storeCreator: StateCreator<T>,
  options?: {
    persist?: boolean;
    version?: number;
  }
) {
  const isDev = process.env.NODE_ENV === 'development';

  if (options?.persist) {
    return create<T>()(
      devtools(
        persist(storeCreator, {
          name,
          version: options.version ?? 1,
        }),
        { name, enabled: isDev }
      )
    );
  }

  return create<T>()(devtools(storeCreator, { name, enabled: isDev }));
}

/**
 * Store slice pattern helper
 * Helps create modular store slices
 */
export type StoreSlice<T, U> = (
  set: (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void,
  get: () => T
) => U;

