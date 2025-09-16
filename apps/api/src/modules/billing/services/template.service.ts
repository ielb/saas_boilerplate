import { Injectable, Logger } from '@nestjs/common';
import { Invoice } from '../entities/invoice.entity';
import { BillingTemplate } from '../entities/billing-template.entity';
import { formatCurrency, formatInvoiceDate } from '../utils/invoice.utils';
import mjml from 'mjml';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  async generateInvoiceHtml(
    invoice: Invoice,
    template?: BillingTemplate
  ): Promise<string> {
    try {
      const templateContent =
        template?.template?.header || this.getDefaultInvoiceTemplate();
      const compiledTemplate = this.compileTemplate(templateContent, invoice);

      // Compile MJML to HTML
      const { html } = mjml(compiledTemplate, {
        validationLevel: 'soft',
      });

      return html;
    } catch (error) {
      this.logger.error('Failed to generate invoice HTML from template', error);
      throw new Error('Failed to generate invoice HTML from template');
    }
  }

  async generateEmailHtml(
    invoice: Invoice,
    template?: BillingTemplate
  ): Promise<string> {
    try {
      const templateContent =
        template?.metadata?.emailContent || this.getDefaultEmailTemplate();
      const compiledTemplate = this.compileTemplate(templateContent, invoice);

      // Compile MJML to HTML
      const { html } = mjml(compiledTemplate, {
        validationLevel: 'soft',
      });

      return html;
    } catch (error) {
      this.logger.error('Failed to generate email HTML from template', error);
      throw new Error('Failed to generate email HTML from template');
    }
  }

  private compileTemplate(template: string, invoice: Invoice): string {
    const { tenant, customer, lineItems, billingAddress } = invoice;

    // Replace template variables with actual data
    return template
      .replace(/\{\{invoice\.invoiceNumber\}\}/g, invoice.invoiceNumber)
      .replace(
        /\{\{invoice\.issuedDate\}\}/g,
        formatInvoiceDate(invoice.issuedDate)
      )
      .replace(/\{\{invoice\.dueDate\}\}/g, formatInvoiceDate(invoice.dueDate))
      .replace(
        /\{\{invoice\.subtotal\}\}/g,
        formatCurrency(invoice.subtotal, invoice.currency)
      )
      .replace(
        /\{\{invoice\.taxAmount\}\}/g,
        formatCurrency(invoice.taxAmount, invoice.currency)
      )
      .replace(
        /\{\{invoice\.discountAmount\}\}/g,
        formatCurrency(invoice.discountAmount, invoice.currency)
      )
      .replace(
        /\{\{invoice\.totalAmount\}\}/g,
        formatCurrency(invoice.totalAmount, invoice.currency)
      )
      .replace(
        /\{\{invoice\.amountPaid\}\}/g,
        formatCurrency(invoice.amountPaid, invoice.currency)
      )
      .replace(
        /\{\{invoice\.amountDue\}\}/g,
        formatCurrency(invoice.amountDue, invoice.currency)
      )
      .replace(/\{\{invoice\.notes\}\}/g, invoice.notes || '')
      .replace(/\{\{invoice\.footer\}\}/g, invoice.footer || '')
      .replace(/\{\{tenant\.name\}\}/g, tenant?.name || 'Company Name')
      .replace(/\{\{tenant\.address\}\}/g, tenant?.address || 'Company Address')
      .replace(
        /\{\{tenant\.contactEmail\}\}/g,
        tenant?.contactEmail || 'company@example.com'
      )
      .replace(/\{\{tenant\.contactPhone\}\}/g, tenant?.contactPhone || '')
      .replace(
        /\{\{customer\.name\}\}/g,
        customer
          ? `${customer.firstName} ${customer.lastName}`
          : billingAddress?.name || ''
      )
      .replace(
        /\{\{customer\.email\}\}/g,
        customer?.email || billingAddress?.email || ''
      )
      .replace(/\{\{billingAddress\.name\}\}/g, billingAddress?.name || '')
      .replace(
        /\{\{billingAddress\.company\}\}/g,
        billingAddress?.company || ''
      )
      .replace(
        /\{\{billingAddress\.addressLine1\}\}/g,
        billingAddress?.addressLine1 || ''
      )
      .replace(
        /\{\{billingAddress\.addressLine2\}\}/g,
        billingAddress?.addressLine2 || ''
      )
      .replace(/\{\{billingAddress\.city\}\}/g, billingAddress?.city || '')
      .replace(/\{\{billingAddress\.state\}\}/g, billingAddress?.state || '')
      .replace(
        /\{\{billingAddress\.postalCode\}\}/g,
        billingAddress?.postalCode || ''
      )
      .replace(
        /\{\{billingAddress\.country\}\}/g,
        billingAddress?.country || ''
      )
      .replace(
        /\{\{lineItems\}\}/g,
        this.generateLineItemsHtml(lineItems, invoice.currency)
      );
  }

  private generateLineItemsHtml(lineItems: any[], currency: string): string {
    return lineItems
      .map(
        item => `
      <mj-table>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:12px;">${item.description}</td>
          <td style="padding:12px;text-align:center;">${item.quantity}</td>
          <td style="padding:12px;text-align:right;">${formatCurrency(item.unitPrice, currency)}</td>
          <td style="padding:12px;text-align:right;">${formatCurrency(item.amount, currency)}</td>
        </tr>
      </mj-table>
    `
      )
      .join('');
  }

  private getDefaultInvoiceTemplate(): string {
    return `
      <mjml>
        <mj-head>
          <mj-title>Invoice {{invoice.invoiceNumber}}</mj-title>
          <mj-preview>Invoice {{invoice.invoiceNumber}} from {{tenant.name}}</mj-preview>
          <mj-attributes>
            <mj-all font-family="Arial, sans-serif"></mj-all>
            <mj-text font-size="16px" color="#333333" line-height="24px"></mj-text>
            <mj-section background-color="#ffffff"></mj-section>
          </mj-attributes>
        </mj-head>
        <mj-body background-color="#f4f4f4">
          <mj-section padding="20px 0">
            <mj-column>
              <mj-text font-size="24px" font-weight="bold" color="#374151">
                {{tenant.name}}
              </mj-text>
              <mj-text font-size="14px" color="#6b7280">
                {{tenant.address}}
              </mj-text>
              <mj-text font-size="14px" color="#6b7280">
                {{tenant.contactEmail}}
              </mj-text>
            </mj-column>
            <mj-column>
              <mj-text font-size="20px" font-weight="bold" color="#374151" align="right">
                INVOICE
              </mj-text>
              <mj-text font-size="14px" color="#6b7280" align="right">
                <strong>Invoice #:</strong> {{invoice.invoiceNumber}}
              </mj-text>
              <mj-text font-size="14px" color="#6b7280" align="right">
                <strong>Date:</strong> {{invoice.issuedDate}}
              </mj-text>
              <mj-text font-size="14px" color="#6b7280" align="right">
                <strong>Due Date:</strong> {{invoice.dueDate}}
              </mj-text>
            </mj-column>
          </mj-section>

          <mj-section padding="20px 0">
            <mj-column>
              <mj-text font-size="16px" font-weight="bold" color="#374151">
                Bill To:
              </mj-text>
              <mj-text font-size="14px" color="#6b7280">
                <strong>{{billingAddress.name}}</strong>
              </mj-text>
              {{#if billingAddress.company}}
              <mj-text font-size="14px" color="#6b7280">
                {{billingAddress.company}}
              </mj-text>
              {{/if}}
              {{#if billingAddress.addressLine1}}
              <mj-text font-size="14px" color="#6b7280">
                {{billingAddress.addressLine1}}
              </mj-text>
              {{/if}}
              {{#if billingAddress.addressLine2}}
              <mj-text font-size="14px" color="#6b7280">
                {{billingAddress.addressLine2}}
              </mj-text>
              {{/if}}
              {{#if billingAddress.city}}
              <mj-text font-size="14px" color="#6b7280">
                {{billingAddress.city}}, {{billingAddress.state}} {{billingAddress.postalCode}}
              </mj-text>
              {{/if}}
              {{#if billingAddress.country}}
              <mj-text font-size="14px" color="#6b7280">
                {{billingAddress.country}}
              </mj-text>
              {{/if}}
            </mj-column>
          </mj-section>

          <mj-section padding="20px 0">
            <mj-column>
              <mj-table>
                <tr style="background-color:#f9fafb;border-bottom:2px solid #e5e7eb;">
                  <th style="padding:12px;text-align:left;font-weight:bold;">Description</th>
                  <th style="padding:12px;text-align:center;font-weight:bold;">Quantity</th>
                  <th style="padding:12px;text-align:right;font-weight:bold;">Unit Price</th>
                  <th style="padding:12px;text-align:right;font-weight:bold;">Amount</th>
                </tr>
                {{lineItems}}
              </mj-table>
            </mj-column>
          </mj-section>

          <mj-section padding="20px 0">
            <mj-column width="70%"></mj-column>
            <mj-column width="30%">
              <mj-table>
                <tr>
                  <td style="padding:8px 0;">Subtotal:</td>
                  <td style="padding:8px 0;text-align:right;">{{invoice.subtotal}}</td>
                </tr>
                {{#if invoice.taxAmount}}
                <tr>
                  <td style="padding:8px 0;">Tax:</td>
                  <td style="padding:8px 0;text-align:right;">{{invoice.taxAmount}}</td>
                </tr>
                {{/if}}
                {{#if invoice.discountAmount}}
                <tr>
                  <td style="padding:8px 0;">Discount:</td>
                  <td style="padding:8px 0;text-align:right;">-{{invoice.discountAmount}}</td>
                </tr>
                {{/if}}
                <tr style="border-top:2px solid #374151;font-weight:bold;">
                  <td style="padding:8px 0;">Total:</td>
                  <td style="padding:8px 0;text-align:right;">{{invoice.totalAmount}}</td>
                </tr>
                {{#if invoice.amountPaid}}
                <tr>
                  <td style="padding:8px 0;">Amount Paid:</td>
                  <td style="padding:8px 0;text-align:right;">{{invoice.amountPaid}}</td>
                </tr>
                <tr style="border-top:2px solid #374151;font-weight:bold;">
                  <td style="padding:8px 0;">Amount Due:</td>
                  <td style="padding:8px 0;text-align:right;">{{invoice.amountDue}}</td>
                </tr>
                {{/if}}
              </mj-table>
            </mj-column>
          </mj-section>

          {{#if invoice.notes}}
          <mj-section padding="20px 0">
            <mj-column>
              <mj-text font-size="16px" font-weight="bold" color="#374151">
                Notes:
              </mj-text>
              <mj-text font-size="14px" color="#6b7280">
                {{invoice.notes}}
              </mj-text>
            </mj-column>
          </mj-section>
          {{/if}}

          {{#if invoice.footer}}
          <mj-section padding="20px 0" border-top="1px solid #e5e7eb">
            <mj-column>
              <mj-text font-size="12px" color="#6b7280">
                {{invoice.footer}}
              </mj-text>
            </mj-column>
          </mj-section>
          {{/if}}
        </mj-body>
      </mjml>
    `;
  }

  private getDefaultEmailTemplate(): string {
    return `
      <mjml>
        <mj-head>
          <mj-title>Invoice {{invoice.invoiceNumber}} - Payment Due</mj-title>
          <mj-preview>Your invoice {{invoice.invoiceNumber}} is ready for payment</mj-preview>
          <mj-attributes>
            <mj-all font-family="Arial, sans-serif"></mj-all>
            <mj-text font-size="16px" color="#333333" line-height="24px"></mj-text>
            <mj-section background-color="#ffffff"></mj-section>
          </mj-attributes>
        </mj-head>
        <mj-body background-color="#f4f4f4">
          <mj-section padding="40px 20px">
            <mj-column>
              <mj-text font-size="24px" font-weight="bold" color="#374151" align="center">
                Invoice Payment Due
              </mj-text>
              <mj-text font-size="16px" color="#6b7280" align="center">
                Hello {{billingAddress.name}},
              </mj-text>
              <mj-text font-size="16px" color="#6b7280" align="center">
                Your invoice {{invoice.invoiceNumber}} for {{invoice.totalAmount}} is due on {{invoice.dueDate}}.
              </mj-text>
              <mj-button background-color="#3b82f6" color="#ffffff" font-size="16px" font-weight="bold" 
                         href="#" border-radius="6px" padding="15px 30px">
                View Invoice
              </mj-button>
              <mj-text font-size="14px" color="#6b7280" align="center">
                Thank you for your business!
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `;
  }
}
