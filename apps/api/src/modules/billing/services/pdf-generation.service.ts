import { Injectable, Logger } from '@nestjs/common';
import { Invoice } from '../entities/invoice.entity';
import { formatCurrency, formatInvoiceDate } from '../utils/invoice.utils';
import {
  formatAddressForPdf,
  normalizeAddress,
} from '../utils/address-formatter.util';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfGenerationService {
  private readonly logger = new Logger(PdfGenerationService.name);

  async generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      this.logger.log(`Generating PDF for invoice ${invoice.invoiceNumber}`);

      const html = this.generateInvoiceHtml(invoice);

      // Launch Puppeteer browser
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      await browser.close();
      browser = null;

      this.logger.log(
        `Successfully generated PDF for invoice ${invoice.invoiceNumber}`
      );
      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error('Failed to generate invoice PDF', error);

      if (browser) {
        await browser.close();
      }

      throw new Error('Failed to generate invoice PDF');
    }
  }

  private generateInvoiceHtml(invoice: Invoice): string {
    const { tenant, customer, lineItems, billingAddress } = invoice;
    // Format both tenant address and billing address
    const formattedTenantAddress = tenant?.address
      ? formatAddressForPdf(tenant.address)
      : 'Company Address';

    const formattedBillingAddress = formatAddressForPdf(
      billingAddress,
      customer ? `${customer.firstName} ${customer.lastName}` : undefined
    );
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .company-info { float: left; }
        .invoice-info { float: right; text-align: right; }
        .clear { clear: both; }
        .billing-info { margin-bottom: 30px; }
        .billing-section { display: inline-block; vertical-align: top; margin-right: 50px; }
        .billing-section h3 { margin: 0 0 10px 0; color: #374151; }
        .billing-section p { margin: 5px 0; }
        .line-items { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .line-items th, .line-items td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .line-items th { background-color: #f9fafb; font-weight: bold; }
        .line-items .amount { text-align: right; }
        .totals { float: right; width: 300px; }
        .totals table { width: 100%; }
        .totals td { padding: 8px 0; }
        .totals .total-row { border-top: 2px solid #374151; font-weight: bold; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h1>${tenant?.name || 'Company Name'}</h1>
            ${formattedTenantAddress}
            <p>${tenant?.contactEmail || 'company@example.com'}</p>
        </div>
        <div class="invoice-info">
            <h2>INVOICE</h2>
            <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${formatInvoiceDate(invoice.issuedDate)}</p>
            <p><strong>Due Date:</strong> ${formatInvoiceDate(invoice.dueDate)}</p>
        </div>
        <div class="clear"></div>
    </div>

    <div class="billing-info">
        <div class="billing-section">
            <h3>Bill To:</h3>
            ${formattedBillingAddress}
        </div>
    </div>

    <table class="line-items">
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            ${lineItems
              .map(
                item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td class="amount">${formatCurrency(item.unitPrice, invoice.currency)}</td>
                    <td class="amount">${formatCurrency(item.amount, invoice.currency)}</td>
                </tr>
            `
              )
              .join('')}
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                <td>Subtotal:</td>
                <td class="amount">${formatCurrency(invoice.subtotal, invoice.currency)}</td>
            </tr>
            ${
              invoice.taxAmount > 0
                ? `
                <tr>
                    <td>Tax:</td>
                    <td class="amount">${formatCurrency(invoice.taxAmount, invoice.currency)}</td>
                </tr>
            `
                : ''
            }
            ${
              invoice.discountAmount > 0
                ? `
                <tr>
                    <td>Discount:</td>
                    <td class="amount">-${formatCurrency(invoice.discountAmount, invoice.currency)}</td>
                </tr>
            `
                : ''
            }
            <tr class="total-row">
                <td>Total:</td>
                <td class="amount">${formatCurrency(invoice.totalAmount, invoice.currency)}</td>
            </tr>
            ${
              invoice.amountPaid > 0
                ? `
                <tr>
                    <td>Amount Paid:</td>
                    <td class="amount">${formatCurrency(invoice.amountPaid, invoice.currency)}</td>
                </tr>
                <tr class="total-row">
                    <td>Amount Due:</td>
                    <td class="amount">${formatCurrency(invoice.amountDue, invoice.currency)}</td>
                </tr>
            `
                : ''
            }
        </table>
    </div>

    <div class="clear"></div>

    ${
      invoice.notes
        ? `
        <div style="margin-top: 30px;">
            <h3>Notes:</h3>
            <p>${invoice.notes}</p>
        </div>
    `
        : ''
    }

    ${
      invoice.footer
        ? `
        <div class="footer">
            <p>${invoice.footer}</p>
        </div>
    `
        : ''
    }
</body>
</html>
    `;
  }

  async generateBillingReportPdf(reportData: any): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      this.logger.log('Generating billing report PDF');

      const html = this.generateReportHtml(reportData);

      // Launch Puppeteer browser
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      await browser.close();
      browser = null;

      this.logger.log('Successfully generated billing report PDF');
      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error('Failed to generate billing report PDF', error);

      if (browser) {
        await browser.close();
      }

      throw new Error('Failed to generate billing report PDF');
    }
  }

  private generateReportHtml(reportData: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Billing Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: bold; color: #374151; }
        .summary-label { color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f9fafb; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Billing Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="summary">
        <div class="summary-item">
            <div class="summary-value">${reportData.totalRevenue || 0}</div>
            <div class="summary-label">Total Revenue</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${reportData.totalInvoices || 0}</div>
            <div class="summary-label">Total Invoices</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${reportData.paidInvoices || 0}</div>
            <div class="summary-label">Paid Invoices</div>
        </div>
    </div>

    <!-- Additional report content would go here -->
</body>
</html>
    `;
  }
}
