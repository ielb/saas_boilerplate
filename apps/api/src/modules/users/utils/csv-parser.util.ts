import { Injectable } from '@nestjs/common';
import csv from 'csv-parser';
import { Readable } from 'stream';

export interface CsvParseResult {
  data: Record<string, any>[];
  headers: string[];
  totalRows: number;
  errors: string[];
}

@Injectable()
export class CsvParserUtil {
  /**
   * Parse CSV buffer and return structured data
   */
  async parse(
    buffer: Buffer,
    options: {
      skipHeaderRow?: boolean;
      maxRows?: number;
    } = {}
  ): Promise<CsvParseResult> {
    const { skipHeaderRow = false, maxRows } = options;

    return new Promise((resolve, reject) => {
      const results: Record<string, any>[] = [];
      const errors: string[] = [];
      let headers: string[] = [];
      let rowCount = 0;
      let isFirstRow = true;

      const stream = Readable.from(buffer);

      stream
        .pipe(
          csv({
            headers: false, // Don't use automatic headers
          })
        )
        .on('data', (row: Record<string, any>) => {
          try {
            rowCount++;

            // First row contains headers
            if (isFirstRow) {
              headers = Object.values(row).map((value: any) =>
                String(value).trim()
              );
              isFirstRow = false;

              // If skipHeaderRow is true, don't add this row to results
              if (skipHeaderRow) {
                return;
              }
            }

            // Check max rows limit
            if (maxRows && rowCount > maxRows) {
              stream.destroy();
              return;
            }

            // Map numbered keys to header names
            const mappedRow: Record<string, any> = {};
            Object.keys(row).forEach((key, index) => {
              if (headers[index]) {
                mappedRow[headers[index]] = row[key];
              }
            });

            // Clean and validate row
            const cleanedRow = this.cleanRow(mappedRow);

            // Skip empty rows
            if (this.isEmptyRow(cleanedRow)) {
              return;
            }

            results.push(cleanedRow);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Row ${rowCount}: ${errorMessage}`);
          }
        })
        .on('end', () => {
          resolve({
            data: results,
            headers,
            totalRows: rowCount,
            errors,
          });
        })
        .on('error', error => {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          reject(new Error(`CSV parsing error: ${errorMessage}`));
        });
    });
  }

  /**
   * Clean and normalize row data
   */
  private cleanRow(row: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.trim();

      if (typeof value === 'string') {
        const cleanValue = value.trim();
        cleaned[cleanKey] = cleanValue === '' ? null : cleanValue;
      } else {
        cleaned[cleanKey] = value;
      }
    }

    return cleaned;
  }

  /**
   * Check if row is empty (all values are null/empty)
   */
  private isEmptyRow(row: Record<string, any>): boolean {
    return Object.values(row).every(
      value => value === null || value === undefined || value === ''
    );
  }

  /**
   * Validate CSV structure and headers
   */
  validateStructure(
    data: Record<string, any>[],
    requiredFields: string[],
    optionalFields: string[] = []
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (data.length === 0) {
      errors.push('CSV file is empty');
      return { isValid: false, errors, warnings };
    }

    const sampleRow = data[0];
    if (!sampleRow) {
      errors.push('CSV file is empty');
      return { isValid: false, errors, warnings };
    }
    const availableFields = Object.keys(sampleRow);

    // Check required fields
    for (const field of requiredFields) {
      if (!availableFields.includes(field)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check for unknown fields
    const allExpectedFields = [...requiredFields, ...optionalFields];
    for (const field of availableFields) {
      if (!allExpectedFields.includes(field)) {
        warnings.push(`Unknown field: ${field}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get CSV statistics
   */
  getStatistics(data: Record<string, any>[]): {
    totalRows: number;
    emptyRows: number;
    fieldStats: Record<
      string,
      { filled: number; empty: number; percentage: number }
    >;
  } {
    const totalRows = data.length;
    let emptyRows = 0;
    const fieldStats: Record<
      string,
      { filled: number; empty: number; percentage: number }
    > = {};

    if (totalRows === 0) {
      return { totalRows: 0, emptyRows: 0, fieldStats: {} };
    }

    const fields = Object.keys(data[0] || {});

    // Initialize field stats
    for (const field of fields) {
      fieldStats[field] = { filled: 0, empty: 0, percentage: 0 };
    }

    // Analyze each row
    for (const row of data) {
      let rowEmpty = true;

      for (const field of fields) {
        const value = row[field];
        if (value !== null && value !== undefined && value !== '') {
          fieldStats[field]!.filled++;
          rowEmpty = false;
        } else {
          fieldStats[field]!.empty++;
        }
      }

      if (rowEmpty) {
        emptyRows++;
      }
    }

    // Calculate percentages
    for (const field of fields) {
      const stats = fieldStats[field];
      if (stats) {
        stats.percentage = Math.round((stats.filled / totalRows) * 100);
      }
    }

    return { totalRows, emptyRows, fieldStats };
  }
}
