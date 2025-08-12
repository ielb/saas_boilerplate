/**
 * Pagination utility functions to ensure safe offset calculations
 */

import { PaginationParams } from '../types/common.types';

export interface SafePaginationResult {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Calculate safe pagination parameters to prevent negative offsets
 * @param params Pagination parameters
 * @param defaultLimit Default limit if not provided
 * @returns Safe pagination parameters
 */
export function calculateSafePagination(
  params: PaginationParams,
  defaultLimit: number = 10
): SafePaginationResult {
  // Ensure page is at least 1
  const page = Math.max(1, params.page ?? 1);

  // Ensure limit is positive and reasonable (max 100)
  const limit = Math.min(Math.max(1, params.limit ?? defaultLimit), 100);

  // Calculate safe offset
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Create a pagination response object
 * @param data The data array
 * @param total Total count of items
 * @param page Current page
 * @param limit Items per page
 * @returns Formatted pagination response
 */
export function createPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Validate pagination parameters and throw error if invalid
 * @param page Page number
 * @param limit Items per page
 */
export function validatePaginationParams(page?: number, limit?: number): void {
  if (page !== undefined && page < 1) {
    throw new Error('Page number must be greater than 0');
  }

  if (limit !== undefined && limit < 1) {
    throw new Error('Limit must be greater than 0');
  }

  if (limit !== undefined && limit > 100) {
    throw new Error('Limit cannot exceed 100 items per page');
  }
}
