import { Repository, Like } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';

export async function generateInvoiceNumber(
  tenantId: string,
  invoiceRepository?: Repository<Invoice>
): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  // Generate a base number with year and month
  const baseNumber = `INV-${year}${month}`;

  if (!invoiceRepository) {
    // If no repository provided, generate a simple timestamp-based number
    const timestamp = Date.now().toString().slice(-6);
    return `${baseNumber}-${timestamp}`;
  }

  // Find the highest invoice number for this tenant and month
  const lastInvoice = await invoiceRepository.findOne({
    where: {
      tenantId,
      invoiceNumber: Like(`${baseNumber}%`),
    },
    order: { invoiceNumber: 'DESC' },
  });

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(
      lastInvoice.invoiceNumber.split('-').pop() || '0'
    );
    sequence = lastSequence + 1;
  }

  return `${baseNumber}-${String(sequence).padStart(4, '0')}`;
}

export function calculateInvoiceTotals(
  lineItems: Array<{
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    discountAmount?: number;
  }>
) {
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

  return {
    subtotal,
    taxAmount,
    discountAmount,
    totalAmount,
  };
}

export function formatCurrency(
  amount: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatInvoiceDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'paid' || invoice.status === 'voided') {
    return false;
  }

  return new Date() > invoice.dueDate;
}

export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return '#6B7280';
    case 'pending':
      return '#F59E0B';
    case 'sent':
      return '#3B82F6';
    case 'paid':
      return '#10B981';
    case 'overdue':
      return '#EF4444';
    case 'voided':
      return '#6B7280';
    case 'partially_paid':
      return '#8B5CF6';
    case 'uncollectible':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}
