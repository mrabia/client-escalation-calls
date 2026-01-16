/**
 * File Storage Service
 * Provides S3-compatible storage for documents and call recordings
 * Supports AWS S3, MinIO, and other S3-compatible storage providers
 */

import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createLogger, Logger } from '@/utils/logger';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

/**
 * Storage configuration
 */
export interface StorageConfig {
  endpoint?: string;          // For MinIO or custom S3-compatible
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;   // Required for MinIO
}

/**
 * File metadata
 */
export interface FileMetadata {
  id: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedBy?: string;
  customerId?: string;
  taskId?: string;
  tags?: string[];
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Upload options
 */
export interface UploadOptions {
  customerId?: string;
  taskId?: string;
  category?: 'document' | 'recording' | 'attachment' | 'export';
  tags?: string[];
  expiresIn?: number;         // Days until expiration
  contentDisposition?: 'inline' | 'attachment';
  metadata?: Record<string, string>;
}

/**
 * Presigned URL options
 */
export interface PresignedUrlOptions {
  expiresIn?: number;         // Seconds (default: 3600)
  responseContentType?: string;
  responseContentDisposition?: string;
}

/**
 * File Storage Service
 */
export class FileStorageService {
  private static instance: FileStorageService | null = null;
  
  private client: S3Client | null = null;
  private readonly logger: Logger;
  private readonly bucket: string;
  private readonly enabled: boolean;

  // Storage categories and their paths
  private readonly categories = {
    document: 'documents',
    recording: 'recordings',
    attachment: 'attachments',
    export: 'exports'
  };

  private constructor() {
    this.logger = createLogger('FileStorageService');
    this.bucket = process.env.S3_BUCKET || 'escalation-files';
    this.enabled = Boolean(
      process.env.S3_ACCESS_KEY_ID || 
      process.env.AWS_ACCESS_KEY_ID ||
      process.env.MINIO_ACCESS_KEY
    );

    if (this.enabled) {
      this.initializeClient();
    }
  }

  /**
   * Initialize S3 client
   */
  private initializeClient(): void {
    const endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT;
    const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY || '';
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY || '';

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      forcePathStyle: Boolean(endpoint) // Required for MinIO
    });

    this.logger.info('File storage service initialized', { 
      endpoint: endpoint || 'AWS S3',
      bucket: this.bucket,
      region 
    });
  }

  static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  /**
   * Upload a file
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions = {}
  ): Promise<FileMetadata> {
    if (!this.enabled || !this.client) {
      throw new Error('File storage is not configured');
    }

    const category = options.category || 'document';
    const fileId = this.generateFileId();
    const extension = path.extname(originalName);
    const storagePath = this.buildStoragePath(category, fileId, extension, options);
    
    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // Build metadata
    const s3Metadata: Record<string, string> = {
      'original-name': originalName,
      'checksum': checksum,
      ...(options.customerId && { 'customer-id': options.customerId }),
      ...(options.taskId && { 'task-id': options.taskId }),
      ...(options.tags && { 'tags': options.tags.join(',') }),
      ...options.metadata
    };

    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
        Body: buffer,
        ContentType: mimeType,
        ContentDisposition: options.contentDisposition === 'attachment' 
          ? `attachment; filename="${originalName}"`
          : undefined,
        Metadata: s3Metadata
      }));

      const metadata: FileMetadata = {
        id: fileId,
        originalName,
        storagePath,
        mimeType,
        size: buffer.length,
        checksum,
        uploadedBy: options.metadata?.['uploaded-by'],
        customerId: options.customerId,
        taskId: options.taskId,
        tags: options.tags,
        createdAt: new Date(),
        expiresAt: options.expiresIn 
          ? new Date(Date.now() + options.expiresIn * 24 * 60 * 60 * 1000)
          : undefined
      };

      this.logger.info('File uploaded', { 
        id: fileId, 
        path: storagePath, 
        size: buffer.length 
      });

      return metadata;
    } catch (error) {
      this.logger.error('Failed to upload file', { error, originalName });
      throw error;
    }
  }

  /**
   * Upload a call recording
   */
  async uploadRecording(
    buffer: Buffer,
    callId: string,
    customerId: string,
    options: Partial<UploadOptions> = {}
  ): Promise<FileMetadata> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording_${callId}_${timestamp}.wav`;
    
    return this.uploadFile(buffer, filename, 'audio/wav', {
      ...options,
      category: 'recording',
      customerId,
      metadata: {
        ...options.metadata,
        'call-id': callId
      }
    });
  }

  /**
   * Download a file
   */
  async downloadFile(storagePath: string): Promise<{ buffer: Buffer; metadata: Record<string, string> }> {
    if (!this.enabled || !this.client) {
      throw new Error('File storage is not configured');
    }

    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: storagePath
      }));

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      return {
        buffer,
        metadata: response.Metadata || {}
      };
    } catch (error) {
      this.logger.error('Failed to download file', { error, storagePath });
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(storagePath: string): Promise<FileMetadata | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storagePath
      }));

      const metadata = response.Metadata || {};
      
      return {
        id: storagePath.split('/').pop()?.split('.')[0] || storagePath,
        originalName: metadata['original-name'] || path.basename(storagePath),
        storagePath,
        mimeType: response.ContentType || 'application/octet-stream',
        size: response.ContentLength || 0,
        checksum: metadata['checksum'] || '',
        customerId: metadata['customer-id'],
        taskId: metadata['task-id'],
        tags: metadata['tags']?.split(','),
        createdAt: response.LastModified || new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get file metadata', { error, storagePath });
      return null;
    }
  }

  /**
   * Generate presigned URL for direct access
   */
  async getPresignedUrl(
    storagePath: string,
    options: PresignedUrlOptions = {}
  ): Promise<string> {
    if (!this.enabled || !this.client) {
      throw new Error('File storage is not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
      ResponseContentType: options.responseContentType,
      ResponseContentDisposition: options.responseContentDisposition
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: options.expiresIn || 3600 // 1 hour default
    });

    return url;
  }

  /**
   * Generate presigned URL for upload
   */
  async getUploadUrl(
    storagePath: string,
    mimeType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    if (!this.enabled || !this.client) {
      throw new Error('File storage is not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
      ContentType: mimeType
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Delete a file
   */
  async deleteFile(storagePath: string): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return false;
    }

    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storagePath
      }));

      this.logger.info('File deleted', { storagePath });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete file', { error, storagePath });
      return false;
    }
  }

  /**
   * Copy a file
   */
  async copyFile(sourcePath: string, destPath: string): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return false;
    }

    try {
      await this.client.send(new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourcePath}`,
        Key: destPath
      }));

      this.logger.info('File copied', { sourcePath, destPath });
      return true;
    } catch (error) {
      this.logger.error('Failed to copy file', { error, sourcePath, destPath });
      return false;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(
    prefix: string,
    options: { maxKeys?: number; continuationToken?: string } = {}
  ): Promise<{ files: FileMetadata[]; nextToken?: string }> {
    if (!this.enabled || !this.client) {
      return { files: [] };
    }

    try {
      const response = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: options.maxKeys || 100,
        ContinuationToken: options.continuationToken
      }));

      const files: FileMetadata[] = (response.Contents || []).map(obj => ({
        id: obj.Key?.split('/').pop()?.split('.')[0] || obj.Key || '',
        originalName: path.basename(obj.Key || ''),
        storagePath: obj.Key || '',
        mimeType: 'application/octet-stream', // Would need HEAD request for actual type
        size: obj.Size || 0,
        checksum: obj.ETag?.replace(/"/g, '') || '',
        createdAt: obj.LastModified || new Date()
      }));

      return {
        files,
        nextToken: response.NextContinuationToken
      };
    } catch (error) {
      this.logger.error('Failed to list files', { error, prefix });
      return { files: [] };
    }
  }

  /**
   * List files for a customer
   */
  async listCustomerFiles(
    customerId: string,
    category?: 'document' | 'recording' | 'attachment'
  ): Promise<FileMetadata[]> {
    const prefix = category 
      ? `${this.categories[category]}/customers/${customerId}/`
      : `customers/${customerId}/`;
    
    const result = await this.listFiles(prefix);
    return result.files;
  }

  /**
   * List recordings for a task
   */
  async listTaskRecordings(taskId: string): Promise<FileMetadata[]> {
    const prefix = `${this.categories.recording}/tasks/${taskId}/`;
    const result = await this.listFiles(prefix);
    return result.files;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Build storage path
   */
  private buildStoragePath(
    category: string,
    fileId: string,
    extension: string,
    options: UploadOptions
  ): string {
    const categoryPath = this.categories[category as keyof typeof this.categories] || 'misc';
    const datePath = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    let basePath = categoryPath;
    
    if (options.customerId) {
      basePath += `/customers/${options.customerId}`;
    }
    
    if (options.taskId) {
      basePath += `/tasks/${options.taskId}`;
    }
    
    return `${basePath}/${datePath}/${fileId}${extension}`;
  }

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Get storage statistics (approximate)
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    byCategory: Record<string, number>;
  }> {
    if (!this.enabled || !this.client) {
      return { totalFiles: 0, byCategory: {} };
    }

    const stats = {
      totalFiles: 0,
      byCategory: {} as Record<string, number>
    };

    for (const [name, prefix] of Object.entries(this.categories)) {
      const result = await this.listFiles(prefix + '/');
      stats.byCategory[name] = result.files.length;
      stats.totalFiles += result.files.length;
    }

    return stats;
  }
}

/**
 * Get singleton instance
 */
export function getFileStorageService(): FileStorageService {
  return FileStorageService.getInstance();
}
