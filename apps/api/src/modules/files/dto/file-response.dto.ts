import { FileStatus, FileVisibility } from '../entities/file.entity';

export class FileMetadataResponseDto {
  id!: string;
  key!: string;
  originalName!: string;
  mimeType!: string;
  size!: number;
  extension!: string;
  path?: string;
  publicUrl?: string;
  storageProvider?: string;
  status!: FileStatus;
  visibility!: FileVisibility;
  metadata?: Record<string, any>;
  virusScanResult?: {
    scanned: boolean;
    clean: boolean;
    threats: string[];
    scannedAt: Date;
  };
  isVirusScanned!: boolean;
  checksum?: string;
  uploadSessionId?: string;
  uploadedBy!: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  tenant?: {
    id: string;
    name: string;
  };
  permissions?: {
    read: string[];
    write: string[];
    delete: string[];
  };
  expiresAt?: Date;
  isDeleted!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;
}

export class FileUploadResponseDto {
  success!: boolean;
  data!: FileMetadataResponseDto;
  message!: string;
  uploadUrl?: string;
  signedUrl?: string;
}

export class FileListResponseDto {
  success!: boolean;
  data!: {
    files: FileMetadataResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message!: string;
}

export class FileHealthResponseDto {
  success!: boolean;
  data!: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      lastCheck: Date;
    }>;
    timestamp: Date;
  };
  message!: string;
}

export class FileSignedUrlResponseDto {
  success!: boolean;
  data!: {
    signedUrl: string;
    expiresAt: Date;
    key: string;
  };
  message!: string;
}

export class FileCopyMoveResponseDto {
  success!: boolean;
  data!: {
    sourceKey: string;
    destinationKey: string;
    metadata: FileMetadataResponseDto;
  };
  message!: string;
}
