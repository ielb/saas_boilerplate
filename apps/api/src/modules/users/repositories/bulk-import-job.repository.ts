import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  BulkImportJob,
  BulkImportJobStatus,
} from '../entities/bulk-import-job.entity';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';

@Injectable()
export class BulkImportJobRepository extends TenantScopedRepository<BulkImportJob> {
  constructor(private dataSource: DataSource) {
    super(BulkImportJob, dataSource.manager);
  }

  protected getTenantIdField(): string {
    return 'tenantId';
  }

  /**
   * Create a new bulk import job
   */
  async createJob(jobData: Partial<BulkImportJob>): Promise<BulkImportJob> {
    const job = this.create(jobData);
    return await this.save(job);
  }

  /**
   * Update job status and progress
   */
  async updateJobStatus(
    jobId: string,
    status: BulkImportJobStatus,
    progress?: {
      processedRecords?: number;
      successfulRecords?: number;
      failedRecords?: number;
    }
  ): Promise<void> {
    const updateData: Partial<BulkImportJob> = { status };

    if (status === BulkImportJobStatus.PROCESSING && !progress) {
      updateData.startedAt = new Date();
    }

    if (
      status === BulkImportJobStatus.COMPLETED ||
      status === BulkImportJobStatus.FAILED
    ) {
      updateData.completedAt = new Date();
    }

    if (progress) {
      if (progress.processedRecords !== undefined) {
        updateData.processedRecords = progress.processedRecords;
      }
      if (progress.successfulRecords !== undefined) {
        updateData.successfulRecords = progress.successfulRecords;
      }
      if (progress.failedRecords !== undefined) {
        updateData.failedRecords = progress.failedRecords;
      }
    }

    await this.update(jobId, updateData);
  }

  /**
   * Get job by ID with tenant scoping
   */
  async findJobById(
    jobId: string,
    tenantId: string
  ): Promise<BulkImportJob | null> {
    return await this.findOne({
      where: { id: jobId, tenantId },
      relations: ['errors'],
    });
  }

  /**
   * Get jobs by status
   */
  async findJobsByStatus(
    status: BulkImportJobStatus,
    tenantId: string,
    limit: number = 10
  ): Promise<BulkImportJob[]> {
    return await this.find({
      where: { status, tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get recent jobs for tenant
   */
  async findRecentJobs(
    tenantId: string,
    limit: number = 20
  ): Promise<BulkImportJob[]> {
    return await this.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['errors'],
    });
  }

  /**
   * Get job statistics for tenant
   */
  async getJobStatistics(tenantId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const stats = await this.createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('job.tenantId = :tenantId', { tenantId })
      .groupBy('job.status')
      .getRawMany();

    const result = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const stat of stats) {
      const count = parseInt(stat.count);
      result.total += count;
      if (stat.status in result) {
        (result as any)[stat.status] = count;
      }
    }

    return result;
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(
    tenantId: string,
    daysOld: number = 30
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.createQueryBuilder()
      .delete()
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('status IN (:...statuses)', {
        statuses: [BulkImportJobStatus.COMPLETED, BulkImportJobStatus.FAILED],
      })
      .andWhere('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get jobs that are stuck in processing state
   */
  async findStuckJobs(
    tenantId: string,
    timeoutMinutes: number = 30
  ): Promise<BulkImportJob[]> {
    const timeoutDate = new Date();
    timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes);

    return await this.createQueryBuilder('job')
      .where('job.tenantId = :tenantId', { tenantId })
      .andWhere('job.status = :status', {
        status: BulkImportJobStatus.PROCESSING,
      })
      .andWhere('job.startedAt < :timeoutDate', { timeoutDate })
      .getMany();
  }

  /**
   * Reset stuck jobs to pending status
   */
  async resetStuckJobs(
    tenantId: string,
    timeoutMinutes: number = 30
  ): Promise<number> {
    const stuckJobs = await this.findStuckJobs(tenantId, timeoutMinutes);

    for (const job of stuckJobs) {
      await this.updateJobStatus(job.id, BulkImportJobStatus.PENDING);
    }

    return stuckJobs.length;
  }
}
