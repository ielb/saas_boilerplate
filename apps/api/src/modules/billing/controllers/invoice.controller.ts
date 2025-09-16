import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { InvoiceService } from '../services/invoice.service';
import { PdfGenerationService } from '../services/pdf-generation.service';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';

@Controller('billing/invoices')
@UseGuards(JwtAuthGuard, TenantGuard)
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly pdfGenerationService: PdfGenerationService
  ) {}

  @Post()
  async createInvoice(
    @Request() req: any,
    @Body() createInvoiceDto: CreateInvoiceDto
  ) {
    const tenantId = req.user.tenantId;
    const invoice = await this.invoiceService.createInvoice(
      tenantId,
      createInvoiceDto
    );

    return {
      success: true,
      data: invoice,
      message: 'Invoice created successfully',
    };
  }

  @Get()
  async getInvoices(@Request() req: any, @Query() query: InvoiceQueryDto) {
    const tenantId = req.user.tenantId;
    const result = await this.invoiceService.findByTenant(tenantId, query);

    return {
      success: true,
      data: result.invoices,
      pagination: {
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: Math.ceil(result.total / (query.limit || 10)),
      },
    };
  }

  @Get(':id')
  async getInvoice(@Request() req: any, @Param('id') id: string) {
    if (
      !id ||
      id === null ||
      id === undefined ||
      typeof id !== 'string' ||
      id === 'null' ||
      id === 'undefined'
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_INVOICE_ID',
          message: 'Invoice ID is required',
        },
      };
    }

    const tenantId = req.user.tenantId;
    const invoice = await this.invoiceService.findById(id);

    if (invoice.tenantId !== tenantId) {
      return {
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: 'Invoice not found',
        },
      };
    }

    return {
      success: true,
      data: invoice,
    };
  }

  @Put(':id')
  async updateInvoice(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto
  ) {
    if (
      !id ||
      id === null ||
      id === undefined ||
      typeof id !== 'string' ||
      id === 'null' ||
      id === 'undefined'
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_INVOICE_ID',
          message: 'Invoice ID is required',
        },
      };
    }

    const tenantId = req.user.tenantId;
    const invoice = await this.invoiceService.updateInvoice(
      id,
      tenantId,
      updateInvoiceDto
    );

    return {
      success: true,
      data: invoice,
      message: 'Invoice updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInvoice(@Request() req: any, @Param('id') id: string) {
    if (
      !id ||
      id === null ||
      id === undefined ||
      typeof id !== 'string' ||
      id === 'null' ||
      id === 'undefined'
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_INVOICE_ID',
          message: 'Invoice ID is required',
        },
      };
    }

    const tenantId = req.user.tenantId;
    await this.invoiceService.deleteInvoice(id, tenantId);
    return {
      success: true,
      message: 'Invoice deleted successfully',
    };
  }

  @Post(':id/mark-paid')
  async markAsPaid(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { amountPaid: number }
  ) {
    if (
      !id ||
      id === null ||
      id === undefined ||
      typeof id !== 'string' ||
      id === 'null' ||
      id === 'undefined'
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_INVOICE_ID',
          message: 'Invoice ID is required',
        },
      };
    }

    const tenantId = req.user.tenantId;
    const invoice = await this.invoiceService.markAsPaid(
      id,
      tenantId,
      body.amountPaid
    );

    return {
      success: true,
      data: invoice,
      message: 'Invoice marked as paid',
    };
  }

  @Post(':id/void')
  async voidInvoice(@Request() req: any, @Param('id') id: string) {
    if (
      !id ||
      id === null ||
      id === undefined ||
      typeof id !== 'string' ||
      id === 'null' ||
      id === 'undefined'
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_INVOICE_ID',
          message: 'Invoice ID is required',
        },
      };
    }

    const tenantId = req.user.tenantId;
    const invoice = await this.invoiceService.voidInvoice(id, tenantId);

    return {
      success: true,
      data: invoice,
      message: 'Invoice voided successfully',
    };
  }

  @Post(':id/send')
  async sendInvoice(@Request() req: any, @Param('id') id: string) {
    if (
      !id ||
      id === null ||
      id === undefined ||
      typeof id !== 'string' ||
      id === 'null' ||
      id === 'undefined'
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_INVOICE_ID',
          message: 'Invoice ID is required',
        },
      };
    }

    const tenantId = req.user.tenantId;
    const invoice = await this.invoiceService.sendInvoice(id, tenantId);

    return {
      success: true,
      data: invoice,
      message: 'Invoice sent successfully',
    };
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async getInvoicePdf(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    if (
      !id ||
      id === null ||
      id === undefined ||
      typeof id !== 'string' ||
      id === 'null' ||
      id === 'undefined'
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INVOICE_ID',
          message: 'Invoice ID is required',
        },
      });
    }

    try {
      const tenantId = req.user.tenantId;
      const invoice = await this.invoiceService.findById(id);

      if (invoice.tenantId !== tenantId) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'INVOICE_NOT_FOUND',
            message: 'Invoice not found',
          },
        });
      }

      const pdfBuffer =
        await this.pdfGenerationService.generateInvoicePdf(invoice);

      // Set appropriate headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send the PDF file
      return res.send(pdfBuffer);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'PDF_GENERATION_ERROR',
          message: 'Failed to generate invoice PDF',
        },
      });
    }
  }
}
