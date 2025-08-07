import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  offset?: string | number;
}

export interface SafePaginationQuery {
  page: number;
  limit: number;
  offset?: number;
}

@Injectable()
export class PaginationValidationPipe implements PipeTransform {
  transform(value: PaginationQuery): SafePaginationQuery {
    const result: SafePaginationQuery = {
      page: 1,
      limit: 10,
    };

    // Validate and set page
    if (value.page !== undefined) {
      const page =
        typeof value.page === 'string' ? parseInt(value.page, 10) : value.page;

      if (isNaN(page) || page < 1) {
        throw new BadRequestException(
          'Page must be a positive integer greater than 0'
        );
      }

      result.page = page;
    }

    // Validate and set limit
    if (value.limit !== undefined) {
      const limit =
        typeof value.limit === 'string'
          ? parseInt(value.limit, 10)
          : value.limit;

      if (isNaN(limit) || limit < 1) {
        throw new BadRequestException(
          'Limit must be a positive integer greater than 0'
        );
      }

      if (limit > 100) {
        throw new BadRequestException('Limit cannot exceed 100 items per page');
      }

      result.limit = limit;
    }

    // Validate and set offset (if provided directly)
    if (value.offset !== undefined) {
      const offset =
        typeof value.offset === 'string'
          ? parseInt(value.offset, 10)
          : value.offset;

      if (isNaN(offset) || offset < 0) {
        throw new BadRequestException('Offset must be a non-negative integer');
      }

      result.offset = offset;
    }

    return result;
  }
}
