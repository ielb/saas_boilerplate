import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { TaxCalculationService } from '../services/tax-calculation.service';
import { TaxReportingService } from '../services/tax-reporting.service';
import {
  TaxCalculationRequestDto,
  TaxCalculationResponseDto,
  CreateTaxRateDto,
  UpdateTaxRateDto,
  TaxRateResponseDto,
  TaxRateQueryDto,
  CreateTaxExemptionDto,
  UpdateTaxExemptionDto,
  TaxExemptionResponseDto,
  TaxExemptionQueryDto,
  TaxReportRequestDto,
} from '../dto/tax.dto';

@Controller('tax')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TaxController {
  constructor(
    private readonly taxCalculationService: TaxCalculationService,
    private readonly taxReportingService: TaxReportingService
  ) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  async calculateTax(
    @Body(ValidationPipe) calculateTaxDto: TaxCalculationRequestDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: TaxCalculationResponseDto }> {
    try {
      const result = await this.taxCalculationService.calculateTax({
        ...calculateTaxDto,
        tenantId: req.user.tenantId,
      });

      return {
        success: true,
        data: result as TaxCalculationResponseDto,
      };
    } catch (error) {
      throw new BadRequestException(`Tax calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Tax Rates Management
  @Get('rates')
  async getTaxRates(
    @Query(ValidationPipe) query: TaxRateQueryDto,
    @Request() req: any
  ): Promise<{
    success: boolean;
    data: TaxRateResponseDto[];
    pagination: { page: number; limit: number; total: number };
  }> {
    try {
      const filters: any = {};
      if (query.country) filters.country = query.country;
      if (query.state) filters.state = query.state;
      if (query.enabled !== undefined) filters.enabled = query.enabled;

      const taxRates = await this.taxCalculationService.getTaxRates(filters);

      // Apply pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRates = taxRates.slice(startIndex, endIndex);

      const responseData: TaxRateResponseDto[] = paginatedRates.map(rate => ({
        id: rate.id,
        jurisdictionCode: rate.jurisdictionCode,
        name: rate.name,
        country: rate.country,
        state: rate.state || undefined,
        city: rate.city || undefined,
        postalCode: rate.postalCode || undefined,
        taxType: rate.taxType,
        rate: rate.rate,
        threshold: rate.threshold || undefined,
        enabled: rate.enabled,
        effectiveDate: rate.effectiveDate || undefined,
        expirationDate: rate.expirationDate || undefined,
        description: rate.description || undefined,
        displayRate: rate.getDisplayRate(),
        isValid: rate.isValidForDate(),
        metadata: rate.metadata || undefined,
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt,
      }));

      return {
        success: true,
        data: responseData,
        pagination: {
          page,
          limit,
          total: taxRates.length,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve tax rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Post('rates')
  async createTaxRate(
    @Body(ValidationPipe) createTaxRateDto: CreateTaxRateDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: TaxRateResponseDto }> {
    try {
      const taxRateData: any = { ...createTaxRateDto };
      if (createTaxRateDto.effectiveDate) {
        taxRateData.effectiveDate = new Date(createTaxRateDto.effectiveDate);
      }
      if (createTaxRateDto.expirationDate) {
        taxRateData.expirationDate = new Date(createTaxRateDto.expirationDate);
      }

      const taxRate = await this.taxCalculationService.createTaxRate(taxRateData);

      const responseData: TaxRateResponseDto = {
        id: taxRate.id,
        jurisdictionCode: taxRate.jurisdictionCode,
        name: taxRate.name,
        country: taxRate.country,
        state: taxRate.state,
        city: taxRate.city,
        postalCode: taxRate.postalCode,
        taxType: taxRate.taxType,
        rate: taxRate.rate,
        threshold: taxRate.threshold,
        enabled: taxRate.enabled,
        effectiveDate: taxRate.effectiveDate,
        expirationDate: taxRate.expirationDate,
        description: taxRate.description,
        displayRate: taxRate.getDisplayRate(),
        isValid: taxRate.isValidForDate(),
        metadata: taxRate.metadata,
        createdAt: taxRate.createdAt,
        updatedAt: taxRate.updatedAt,
      };

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create tax rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Put('rates/:id')
  async updateTaxRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateTaxRateDto: UpdateTaxRateDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: TaxRateResponseDto }> {
    try {
      const updateData: any = { ...updateTaxRateDto };
      if (updateTaxRateDto.effectiveDate) {
        updateData.effectiveDate = new Date(updateTaxRateDto.effectiveDate);
      }
      if (updateTaxRateDto.expirationDate) {
        updateData.expirationDate = new Date(updateTaxRateDto.expirationDate);
      }

      const taxRate = await this.taxCalculationService.updateTaxRate(id, updateData);

      const responseData: TaxRateResponseDto = {
        id: taxRate.id,
        jurisdictionCode: taxRate.jurisdictionCode,
        name: taxRate.name,
        country: taxRate.country,
        state: taxRate.state,
        city: taxRate.city,
        postalCode: taxRate.postalCode,
        taxType: taxRate.taxType,
        rate: taxRate.rate,
        threshold: taxRate.threshold,
        enabled: taxRate.enabled,
        effectiveDate: taxRate.effectiveDate,
        expirationDate: taxRate.expirationDate,
        description: taxRate.description,
        displayRate: taxRate.getDisplayRate(),
        isValid: taxRate.isValidForDate(),
        metadata: taxRate.metadata,
        createdAt: taxRate.createdAt,
        updatedAt: taxRate.updatedAt,
      };

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundException(`Tax rate with ID ${id} not found`);
      }
      throw new BadRequestException(`Failed to update tax rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Tax Exemptions Management
  @Get('exemptions')
  async getTaxExemptions(
    @Query(ValidationPipe) query: TaxExemptionQueryDto,
    @Request() req: any
  ): Promise<{
    success: boolean;
    data: TaxExemptionResponseDto[];
    pagination: { page: number; limit: number; total: number };
  }> {
    try {
      const tenantId = query.tenantId || req.user.tenantId;
      const exemptions = await this.taxCalculationService.getTaxExemptions(
        tenantId,
        query.customerId
      );

      // Apply filters
      let filteredExemptions = exemptions;
      if (query.status) {
        filteredExemptions = filteredExemptions.filter(e => e.status === query.status);
      }
      if (query.exemptionType) {
        filteredExemptions = filteredExemptions.filter(e => e.exemptionType === query.exemptionType);
      }
      if (query.country) {
        filteredExemptions = filteredExemptions.filter(e => e.country === query.country!.toUpperCase());
      }
      if (query.state) {
        filteredExemptions = filteredExemptions.filter(e => e.state === query.state!.toUpperCase());
      }
      if (query.expiringSoon) {
        filteredExemptions = filteredExemptions.filter(e => e.isExpiringSoon());
      }

      // Apply pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedExemptions = filteredExemptions.slice(startIndex, endIndex);

      const responseData: TaxExemptionResponseDto[] = paginatedExemptions.map(exemption => ({
        id: exemption.id,
        tenantId: exemption.tenantId,
        customerId: exemption.customerId || undefined,
        exemptionNumber: exemption.exemptionNumber,
        exemptionType: exemption.exemptionType,
        status: exemption.status,
        organizationName: exemption.organizationName,
        country: exemption.country,
        state: exemption.state || undefined,
        jurisdictions: exemption.jurisdictions || undefined,
        issueDate: exemption.issueDate,
        expirationDate: exemption.expirationDate || undefined,
        issuingAuthority: exemption.issuingAuthority || undefined,
        description: exemption.description || undefined,
        notes: exemption.notes || undefined,
        documentUrls: exemption.documentUrls || undefined,
        validationData: exemption.validationData || undefined,
        metadata: exemption.metadata || undefined,
        isValid: exemption.isValid(),
        daysUntilExpiration: exemption.getDaysUntilExpiration() || undefined,
        isExpiringSoon: exemption.isExpiringSoon(),
        createdAt: exemption.createdAt,
        updatedAt: exemption.updatedAt,
      }));

      return {
        success: true,
        data: responseData,
        pagination: {
          page,
          limit,
          total: filteredExemptions.length,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve tax exemptions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Post('exemptions')
  async createTaxExemption(
    @Body(ValidationPipe) createExemptionDto: CreateTaxExemptionDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: TaxExemptionResponseDto }> {
    try {
      const exemptionData: any = {
        ...createExemptionDto,
        tenantId: createExemptionDto.tenantId || req.user.tenantId,
        issueDate: new Date(createExemptionDto.issueDate),
      };
      if (createExemptionDto.expirationDate) {
        exemptionData.expirationDate = new Date(createExemptionDto.expirationDate);
      }

      const exemption = await this.taxCalculationService.createTaxExemption(exemptionData);

      const responseData: TaxExemptionResponseDto = {
        id: exemption.id,
        tenantId: exemption.tenantId,
        customerId: exemption.customerId,
        exemptionNumber: exemption.exemptionNumber,
        exemptionType: exemption.exemptionType,
        status: exemption.status,
        organizationName: exemption.organizationName,
        country: exemption.country,
        state: exemption.state,
        jurisdictions: exemption.jurisdictions,
        issueDate: exemption.issueDate,
        expirationDate: exemption.expirationDate,
        issuingAuthority: exemption.issuingAuthority,
        description: exemption.description,
        notes: exemption.notes,
        documentUrls: exemption.documentUrls,
        validationData: exemption.validationData,
        metadata: exemption.metadata,
        isValid: exemption.isValid(),
        daysUntilExpiration: exemption.getDaysUntilExpiration() || undefined,
        isExpiringSoon: exemption.isExpiringSoon(),
        createdAt: exemption.createdAt,
        updatedAt: exemption.updatedAt,
      };

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create tax exemption: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Put('exemptions/:id')
  async updateTaxExemption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateExemptionDto: UpdateTaxExemptionDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: TaxExemptionResponseDto }> {
    try {
      const updateData = {
        ...updateExemptionDto,
        ...(updateExemptionDto.expirationDate && {
          expirationDate: new Date(updateExemptionDto.expirationDate),
        }),
      };

      // This would need to be implemented in the tax calculation service
      // const exemption = await this.taxCalculationService.updateTaxExemption(id, updateData);

      throw new BadRequestException('Tax exemption update not yet implemented');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundException(`Tax exemption with ID ${id} not found`);
      }
      throw new BadRequestException(`Failed to update tax exemption: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Post('exemptions/:id/validate')
  async validateTaxExemption(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any
  ): Promise<{ success: boolean; data: { valid: boolean; message: string } }> {
    try {
      const isValid = await this.taxCalculationService.validateTaxExemption(id);

      return {
        success: true,
        data: {
          valid: isValid,
          message: isValid ? 'Tax exemption is valid' : 'Tax exemption is invalid or expired',
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to validate tax exemption: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Tax Reporting
  @Post('reports')
  async generateTaxReport(
    @Body(ValidationPipe) reportRequest: TaxReportRequestDto,
    @Request() req: any
  ): Promise<{ success: boolean; data: any }> {
    try {
      const request = {
        ...reportRequest,
        tenantId: reportRequest.tenantId || req.user.tenantId,
        startDate: new Date(reportRequest.startDate),
        endDate: new Date(reportRequest.endDate),
      };

      const report = await this.taxReportingService.generateTaxReport(request);

      // If CSV format is requested, return the CSV string
      if (reportRequest.format === 'csv') {
        let csvData: string;
        if (Array.isArray(report)) {
          csvData = await this.taxReportingService.exportReportToCsv(report);
        } else if ('reportPeriod' in report && 'totals' in report) {
          csvData = await this.taxReportingService.exportReportToCsv(report);
        } else {
          throw new BadRequestException('CSV export not supported for audit reports');
        }
        
        return {
          success: true,
          data: {
            format: 'csv',
            content: csvData,
            filename: `tax-report-${request.reportType}-${request.startDate.toISOString().split('T')[0]}-${request.endDate.toISOString().split('T')[0]}.csv`,
          },
        };
      }

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate tax report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{ success: boolean; message: string; timestamp: string }> {
    return {
      success: true,
      message: 'Tax service is operational',
      timestamp: new Date().toISOString(),
    };
  }
}
