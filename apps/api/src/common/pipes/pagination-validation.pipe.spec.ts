import { BadRequestException } from '@nestjs/common';
import {
  PaginationValidationPipe,
  PaginationQuery,
} from './pagination-validation.pipe';

describe('PaginationValidationPipe', () => {
  let pipe: PaginationValidationPipe;

  beforeEach(() => {
    pipe = new PaginationValidationPipe();
  });

  describe('page validation', () => {
    it('should use default page value when not provided', () => {
      const result = pipe.transform({});
      expect(result.page).toBe(1);
    });

    it('should accept valid page number', () => {
      const result = pipe.transform({ page: 5 });
      expect(result.page).toBe(5);
    });

    it('should accept valid page as string', () => {
      const result = pipe.transform({ page: '3' });
      expect(result.page).toBe(3);
    });

    it('should throw error for negative page', () => {
      expect(() => pipe.transform({ page: -1 })).toThrow(BadRequestException);
      expect(() => pipe.transform({ page: -1 })).toThrow(
        'Page must be a positive integer greater than 0'
      );
    });

    it('should throw error for zero page', () => {
      expect(() => pipe.transform({ page: 0 })).toThrow(BadRequestException);
      expect(() => pipe.transform({ page: 0 })).toThrow(
        'Page must be a positive integer greater than 0'
      );
    });

    it('should throw error for invalid page string', () => {
      expect(() => pipe.transform({ page: 'invalid' })).toThrow(
        BadRequestException
      );
    });
  });

  describe('limit validation', () => {
    it('should use default limit when not provided', () => {
      const result = pipe.transform({});
      expect(result.limit).toBe(10);
    });

    it('should accept valid limit', () => {
      const result = pipe.transform({ limit: 25 });
      expect(result.limit).toBe(25);
    });

    it('should accept valid limit as string', () => {
      const result = pipe.transform({ limit: '50' });
      expect(result.limit).toBe(50);
    });

    it('should throw error for negative limit', () => {
      expect(() => pipe.transform({ limit: -5 })).toThrow(BadRequestException);
      expect(() => pipe.transform({ limit: -5 })).toThrow(
        'Limit must be a positive integer greater than 0'
      );
    });

    it('should throw error for zero limit', () => {
      expect(() => pipe.transform({ limit: 0 })).toThrow(BadRequestException);
      expect(() => pipe.transform({ limit: 0 })).toThrow(
        'Limit must be a positive integer greater than 0'
      );
    });

    it('should throw error for limit exceeding maximum', () => {
      expect(() => pipe.transform({ limit: 101 })).toThrow(BadRequestException);
      expect(() => pipe.transform({ limit: 101 })).toThrow(
        'Limit cannot exceed 100 items per page'
      );
    });

    it('should throw error for invalid limit string', () => {
      expect(() => pipe.transform({ limit: 'invalid' })).toThrow(
        BadRequestException
      );
    });
  });

  describe('offset validation', () => {
    it('should not set offset when not provided', () => {
      const result = pipe.transform({});
      expect(result.offset).toBeUndefined();
    });

    it('should accept valid offset', () => {
      const result = pipe.transform({ offset: 20 });
      expect(result.offset).toBe(20);
    });

    it('should accept zero offset', () => {
      const result = pipe.transform({ offset: 0 });
      expect(result.offset).toBe(0);
    });

    it('should accept valid offset as string', () => {
      const result = pipe.transform({ offset: '15' });
      expect(result.offset).toBe(15);
    });

    it('should throw error for negative offset', () => {
      expect(() => pipe.transform({ offset: -1 })).toThrow(BadRequestException);
      expect(() => pipe.transform({ offset: -1 })).toThrow(
        'Offset must be a non-negative integer'
      );
    });

    it('should throw error for invalid offset string', () => {
      expect(() => pipe.transform({ offset: 'invalid' })).toThrow(
        BadRequestException
      );
    });
  });

  describe('combined validation', () => {
    it('should handle valid combination of parameters', () => {
      const result = pipe.transform({ page: 3, limit: 20, offset: 40 });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(40);
    });

    it('should handle mixed string and number inputs', () => {
      const result = pipe.transform({ page: '2', limit: 15, offset: '30' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(15);
      expect(result.offset).toBe(30);
    });
  });
});
