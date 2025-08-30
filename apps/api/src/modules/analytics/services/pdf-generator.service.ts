import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { ReportResponseDto } from '../dto/analytics.dto';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  /**
   * Generate PDF report from analytics data
   */
  async generateAnalyticsReport(
    reportData: ReportResponseDto,
    analyticsData: any
  ): Promise<{ filePath: string; fileSize: number }> {
    try {
      this.logger.log(`Generating PDF report for ${reportData.reportType}`);

      // Create reports directory if it doesn't exist
      const reportsDir = path.join(process.cwd(), 'reports');
      this.logger.log(`Reports directory: ${reportsDir}`);

      if (!fs.existsSync(reportsDir)) {
        this.logger.log(`Creating reports directory: ${reportsDir}`);
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Generate HTML content
      this.logger.log(`Generating HTML content for report ${reportData.id}`);
      const htmlContent = await this.generateHtmlContent(
        reportData,
        analyticsData
      );
      this.logger.log(`HTML content generated for report ${reportData.id}`);

      // Generate PDF from HTML
      this.logger.log(`Converting HTML to PDF for report ${reportData.id}`);
      const pdfBuffer = await this.generatePdfFromHtml(htmlContent);
      this.logger.log(
        `PDF buffer generated for report ${reportData.id}, size: ${pdfBuffer.length} bytes`
      );

      // Save PDF file
      const fileName = `report_${reportData.id}_${Date.now()}.pdf`;
      const filePath = path.join(reportsDir, fileName);
      this.logger.log(`Saving PDF to: ${filePath}`);

      fs.writeFileSync(filePath, pdfBuffer);
      this.logger.log(`PDF file saved to: ${filePath}`);

      const fileSize = fs.statSync(filePath).size;
      this.logger.log(`PDF file size: ${fileSize} bytes`);

      this.logger.log(`PDF report generated: ${filePath} (${fileSize} bytes)`);

      return { filePath, fileSize };
    } catch (error) {
      this.logger.error(
        `Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.logger.error(
        `PDF generation stack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`
      );
      throw error;
    }
  }

  /**
   * Generate HTML content for the report
   */
  private async generateHtmlContent(
    reportData: ReportResponseDto,
    analyticsData: any
  ): Promise<string> {
    const template = this.getReportTemplate(reportData.reportType);
    const compiledTemplate = handlebars.compile(template);

    const templateData = {
      report: reportData,
      analytics: analyticsData,
      generatedAt: new Date().toISOString(),
      logo: this.getBase64Logo(),
    };

    return compiledTemplate(templateData);
  }

  /**
   * Generate PDF from HTML content using Puppeteer
   */
  private async generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
    let browser;
    try {
      this.logger.log('Launching Puppeteer browser...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.logger.log('Puppeteer browser launched successfully');

      const page = await browser.newPage();
      this.logger.log('New page created');

      this.logger.log('Setting HTML content...');
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      this.logger.log('HTML content set successfully');

      this.logger.log('Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        printBackground: true,
      });
      this.logger.log(
        `PDF generated successfully, buffer size: ${pdfBuffer.length} bytes`
      );

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(
        `Puppeteer PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.logger.error(
        `Puppeteer error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`
      );
      throw error;
    } finally {
      if (browser) {
        try {
          this.logger.log('Closing Puppeteer browser...');
          await browser.close();
          this.logger.log('Puppeteer browser closed successfully');
        } catch (closeError) {
          this.logger.error(
            `Failed to close browser: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`
          );
        }
      }
    }
  }

  /**
   * Get appropriate template based on report type
   */
  private getReportTemplate(reportType: string): string {
    switch (reportType) {
      case 'usage':
        return this.getUsageReportTemplate();
      case 'user_activity':
        return this.getUserActivityReportTemplate();
      case 'feature_adoption':
        return this.getFeatureAdoptionReportTemplate();
      case 'performance':
        return this.getPerformanceReportTemplate();
      default:
        return this.getDefaultReportTemplate();
    }
  }

  /**
   * Usage report template
   */
  private getUsageReportTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>{{report.reportName}}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .logo { width: 100px; height: auto; }
          .title { font-size: 24px; font-weight: bold; color: #333; margin: 10px 0; }
          .subtitle { font-size: 16px; color: #666; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .metric { display: inline-block; margin: 10px; padding: 15px; background: #f5f5f5; border-radius: 5px; min-width: 150px; text-align: center; }
          .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
          .metric-label { font-size: 12px; color: #666; margin-top: 5px; }
          .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background-color: #f5f5f5; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="{{logo}}" alt="Logo" class="logo">
          <div class="title">{{report.reportName}}</div>
          <div class="subtitle">{{report.description}}</div>
          <div class="subtitle">Generated on {{generatedAt}}</div>
        </div>

        <div class="section">
          <div class="section-title">Report Summary</div>
          <div class="metric">
            <div class="metric-value">{{analytics.totalEvents}}</div>
            <div class="metric-label">Total Events</div>
          </div>
          <div class="metric">
            <div class="metric-value">{{analytics.uniqueUsers}}</div>
            <div class="metric-label">Unique Users</div>
          </div>
          <div class="metric">
            <div class="metric-value">{{analytics.activeSessions}}</div>
            <div class="metric-label">Active Sessions</div>
          </div>
        </div>

        {{#if analytics.recentEvents}}
        <div class="section">
          <div class="section-title">Recent Events</div>
          <table class="table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Event Name</th>
                <th>User</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {{#each analytics.recentEvents}}
              <tr>
                <td>{{eventType}}</td>
                <td>{{eventName}}</td>
                <td>{{user.email}}</td>
                <td>{{timestamp}}</td>
              </tr>
              {{/each}}
            </tbody>
          </table>
        </div>
        {{/if}}

        {{#if analytics.aggregates}}
        <div class="section">
          <div class="section-title">Aggregated Metrics</div>
          <table class="table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Period</th>
                <th>Total Value</th>
                <th>Average</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {{#each analytics.aggregates}}
              <tr>
                <td>{{metricName}}</td>
                <td>{{period}}</td>
                <td>{{totalValue}}</td>
                <td>{{averageValue}}</td>
                <td>{{count}}</td>
              </tr>
              {{/each}}
            </tbody>
          </table>
        </div>
        {{/if}}

        <div class="footer">
          <p>This report was generated automatically by the Analytics System</p>
          <p>Report ID: {{report.id}} | Status: {{report.status}}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * User activity report template
   */
  private getUserActivityReportTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>{{report.reportName}}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #333; margin: 10px 0; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
          .metric { display: inline-block; margin: 10px; padding: 15px; background: #f5f5f5; border-radius: 5px; min-width: 150px; text-align: center; }
          .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
          .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background-color: #f5f5f5; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">{{report.reportName}}</div>
          <div>User Activity Analysis Report</div>
        </div>

        <div class="section">
          <div class="section-title">User Activity Summary</div>
          <div class="metric">
            <div class="metric-value">{{analytics.activeUsers}}</div>
            <div>Active Users</div>
          </div>
          <div class="metric">
            <div class="metric-value">{{analytics.totalUserEvents}}</div>
            <div>Total Events</div>
          </div>
          <div class="metric">
            <div class="metric-value">{{analytics.averageEventsPerUser}}</div>
            <div>Avg Events/User</div>
          </div>
        </div>

        <div class="footer">
          <p>Generated on {{generatedAt}}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Feature adoption report template
   */
  private getFeatureAdoptionReportTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>{{report.reportName}}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #333; margin: 10px 0; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">{{report.reportName}}</div>
          <div>Feature Adoption Analysis</div>
        </div>

        <div class="section">
          <div class="section-title">Feature Usage Overview</div>
          <p>Feature adoption analysis will be displayed here.</p>
        </div>

        <div class="footer">
          <p>Generated on {{generatedAt}}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Performance report template
   */
  private getPerformanceReportTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>{{report.reportName}}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #333; margin: 10px 0; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">{{report.reportName}}</div>
          <div>Performance Analysis Report</div>
        </div>

        <div class="section">
          <div class="section-title">System Performance Metrics</div>
          <p>Performance metrics will be displayed here.</p>
        </div>

        <div class="footer">
          <p>Generated on {{generatedAt}}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Default report template
   */
  private getDefaultReportTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>{{report.reportName}}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #333; margin: 10px 0; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">{{report.reportName}}</div>
          <div>{{report.description}}</div>
        </div>

        <div class="section">
          <div class="section-title">Report Data</div>
          <p>Report data will be displayed here.</p>
        </div>

        <div class="footer">
          <p>Generated on {{generatedAt}}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get base64 encoded logo (placeholder)
   */
  private getBase64Logo(): string {
    // In a real implementation, you would return an actual base64 encoded logo
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMDA3YmZmIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFQSTwvdGV4dD4KPC9zdmc+';
  }
}
