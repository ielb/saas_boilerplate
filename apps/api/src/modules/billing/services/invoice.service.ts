import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In } from 'typeorm';
import { Invoice, InvoiceLineItem } from '../entities';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from '../dto';
import { InvoiceStatus, InvoiceType } from '@app/shared';
import { PaymentTerms } from '@app/shared';
import { generateInvoiceNumber } from '../utils/invoice.utils';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepository: Repository<InvoiceLineItem>
  ) {}

  async createInvoice(
    tenantId: string,
    createInvoiceDto: CreateInvoiceDto
  ): Promise<Invoice> {
    const { lineItems, ...invoiceData } = createInvoiceDto;

    // Generate unique invoice number
    const invoiceNumber = await generateInvoiceNumber(tenantId);

    // Calculate totals
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount = lineItems.reduce((sum, item) => {
      const itemAmount = item.quantity * item.unitPrice;
      return sum + (item.taxRate ? itemAmount * item.taxRate : 0);
    }, 0);
    const discountAmount = lineItems.reduce(
      (sum, item) => sum + (item.discountAmount || 0),
      0
    );
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Create invoice
    const invoice = this.invoiceRepository.create({
      ...invoiceData,
      tenantId,
      invoiceNumber,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      amountDue: totalAmount,
      amountPaid: 0,
      status: InvoiceStatus.DRAFT,
      issuedDate: new Date(),
      dueDate: createInvoiceDto.dueDate
        ? new Date(createInvoiceDto.dueDate)
        : this.calculateDueDate(createInvoiceDto.paymentTerms),
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Create line items
    const lineItemEntities: InvoiceLineItem[] = [];
    for (const item of lineItems) {
      const lineItemData: any = {
        ...item,
        invoiceId: savedInvoice.id,
        amount: item.quantity * item.unitPrice,
        taxAmount: item.taxRate
          ? item.quantity * item.unitPrice * item.taxRate
          : 0,
      };

      if (item.periodStart) {
        lineItemData.periodStart = new Date(item.periodStart);
      }
      if (item.periodEnd) {
        lineItemData.periodEnd = new Date(item.periodEnd);
      }

      lineItemEntities.push(
        this.lineItemRepository.create(lineItemData) as any
      );
    }

    await this.lineItemRepository.save(lineItemEntities);

    return this.findById(savedInvoice.id);
  }

  async findById(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['lineItems', 'customer', 'subscription', 'tenant'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async findByTenant(
    tenantId: string,
    query: InvoiceQueryDto
  ): Promise<{ invoices: Invoice[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      customerId,
      subscriptionId,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.subscription', 'subscription')
      .leftJoinAndSelect('invoice.lineItems', 'lineItems')
      .where('invoice.tenantId = :tenantId', { tenantId });

    if (status) {
      queryBuilder.andWhere('invoice.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('invoice.type = :type', { type });
    }

    if (customerId) {
      queryBuilder.andWhere('invoice.customerId = :customerId', { customerId });
    }

    if (subscriptionId) {
      queryBuilder.andWhere('invoice.subscriptionId = :subscriptionId', {
        subscriptionId,
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'invoice.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      );
    }

    if (search) {
      queryBuilder.andWhere(
        '(invoice.invoiceNumber ILIKE :search OR customer.email ILIKE :search OR customer.firstName ILIKE :search OR customer.lastName ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    queryBuilder
      .orderBy(`invoice.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [invoices, total] = await queryBuilder.getManyAndCount();

    return { invoices, total };
  }

  async updateInvoice(
    id: string,
    tenantId: string,
    updateInvoiceDto: UpdateInvoiceDto
  ): Promise<Invoice> {
    const invoice = await this.findById(id);

    if (invoice.tenantId !== tenantId) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot update a paid invoice');
    }

    // Update line items if provided
    if (updateInvoiceDto.lineItems) {
      // Remove existing line items
      await this.lineItemRepository.delete({ invoiceId: id });

      // Create new line items
      const lineItemEntities: InvoiceLineItem[] = [];
      for (const item of updateInvoiceDto.lineItems) {
        const lineItemData: any = {
          ...item,
          invoiceId: id,
          amount: item.quantity * item.unitPrice,
          taxAmount: item.taxRate
            ? item.quantity * item.unitPrice * item.taxRate
            : 0,
        };

        if (item.periodStart) {
          lineItemData.periodStart = new Date(item.periodStart);
        }
        if (item.periodEnd) {
          lineItemData.periodEnd = new Date(item.periodEnd);
        }

        lineItemEntities.push(
          this.lineItemRepository.create(lineItemData) as any
        );
      }

      await this.lineItemRepository.save(lineItemEntities);

      // Recalculate totals
      const subtotal = updateInvoiceDto.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const taxAmount = updateInvoiceDto.lineItems.reduce((sum, item) => {
        const itemAmount = item.quantity * item.unitPrice;
        return sum + (item.taxRate ? itemAmount * item.taxRate : 0);
      }, 0);
      const discountAmount = updateInvoiceDto.lineItems.reduce(
        (sum, item) => sum + (item.discountAmount || 0),
        0
      );
      const totalAmount = subtotal + taxAmount - discountAmount;

      // Update invoice totals directly
      invoice.subtotal = subtotal;
      invoice.taxAmount = taxAmount;
      invoice.discountAmount = discountAmount;
      invoice.totalAmount = totalAmount;
      invoice.amountDue = totalAmount - invoice.amountPaid;
    }

    Object.assign(invoice, updateInvoiceDto);
    const updatedInvoice = await this.invoiceRepository.save(invoice);

    return this.findById(updatedInvoice.id);
  }

  async deleteInvoice(id: string, tenantId: string): Promise<void> {
    const invoice = await this.findById(id);

    if (invoice.tenantId !== tenantId) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot delete a paid invoice');
    }

    await this.invoiceRepository.remove(invoice);
  }

  async markAsPaid(
    id: string,
    tenantId: string,
    amountPaid: number
  ): Promise<Invoice> {
    const invoice = await this.findById(id);

    if (invoice.tenantId !== tenantId) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ConflictException('Invoice is already paid');
    }

    const newAmountPaid = invoice.amountPaid + amountPaid;
    const newAmountDue = invoice.totalAmount - newAmountPaid;

    let newStatus = InvoiceStatus.PARTIALLY_PAID;
    if (newAmountDue <= 0) {
      newStatus = InvoiceStatus.PAID;
    }

    invoice.amountPaid = newAmountPaid;
    invoice.amountDue = Math.max(0, newAmountDue);
    invoice.status = newStatus;
    if (newStatus === InvoiceStatus.PAID) {
      invoice.paidDate = new Date();
    }

    const updatedInvoice = await this.invoiceRepository.save(invoice);
    return this.findById(updatedInvoice.id);
  }

  async voidInvoice(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.findById(id);

    if (invoice.tenantId !== tenantId) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot void a paid invoice');
    }

    invoice.status = InvoiceStatus.VOIDED;
    invoice.voidedDate = new Date();

    const updatedInvoice = await this.invoiceRepository.save(invoice);
    return this.findById(updatedInvoice.id);
  }

  async sendInvoice(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.findById(id);

    if (invoice.tenantId !== tenantId) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Can only send draft invoices');
    }

    invoice.status = InvoiceStatus.PENDING;
    invoice.emailSent = true;
    invoice.emailSentAt = new Date();

    const updatedInvoice = await this.invoiceRepository.save(invoice);
    return this.findById(updatedInvoice.id);
  }

  private calculateDueDate(paymentTerms?: PaymentTerms): Date {
    const now = new Date();

    switch (paymentTerms) {
      case PaymentTerms.DUE_ON_RECEIPT:
        return now;
      case PaymentTerms.NET_15:
        return new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      case PaymentTerms.NET_30:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case PaymentTerms.NET_45:
        return new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
      case PaymentTerms.NET_60:
        return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      case PaymentTerms.NET_90:
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}
