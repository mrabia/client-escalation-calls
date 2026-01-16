/**
 * FileStorageService Unit Tests
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

// Set environment before importing service
process.env.S3_ACCESS_KEY_ID = 'test-access-key';
process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.S3_BUCKET = 'test-bucket';
process.env.S3_REGION = 'us-east-1';

import { FileStorageService, getFileStorageService } from '../../../../src/services/storage/FileStorageService';

const mockS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

describe('FileStorageService', () => {
  let service: FileStorageService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    (FileStorageService as any).instance = null;
    
    // Setup mock send
    mockSend = jest.fn();
    mockS3Client.prototype.send = mockSend;
    
    service = getFileStorageService();
  });

  describe('uploadFile', () => {
    it('should upload a file and return metadata', async () => {
      mockSend.mockResolvedValueOnce({});

      const buffer = Buffer.from('test file content');
      const result = await service.uploadFile(
        buffer,
        'test-document.pdf',
        'application/pdf',
        { customerId: 'cust-123', category: 'document' }
      );

      expect(result).toBeDefined();
      expect(result.originalName).toBe('test-document.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.size).toBe(buffer.length);
      expect(result.customerId).toBe('cust-123');
      expect(result.checksum).toBeDefined();
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should generate unique file IDs', async () => {
      mockSend.mockResolvedValue({});

      const buffer = Buffer.from('test');
      const result1 = await service.uploadFile(buffer, 'file1.txt', 'text/plain');
      const result2 = await service.uploadFile(buffer, 'file2.txt', 'text/plain');

      expect(result1.id).not.toBe(result2.id);
    });

    it('should organize files by category', async () => {
      mockSend.mockResolvedValue({});

      const buffer = Buffer.from('test');
      const result = await service.uploadFile(buffer, 'recording.wav', 'audio/wav', {
        category: 'recording',
        customerId: 'cust-456'
      });

      expect(result.storagePath).toContain('recordings');
      expect(result.storagePath).toContain('cust-456');
    });

    it('should calculate SHA256 checksum', async () => {
      mockSend.mockResolvedValue({});

      const buffer = Buffer.from('test content for checksum');
      const result = await service.uploadFile(buffer, 'test.txt', 'text/plain');

      expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('uploadRecording', () => {
    it('should upload call recording with proper naming', async () => {
      mockSend.mockResolvedValue({});

      const buffer = Buffer.from('audio data');
      const result = await service.uploadRecording(
        buffer,
        'call-123',
        'cust-789'
      );

      expect(result.originalName).toContain('recording_call-123');
      expect(result.mimeType).toBe('audio/wav');
      expect(result.customerId).toBe('cust-789');
    });
  });

  describe('downloadFile', () => {
    it('should download file and return buffer', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from('downloaded content');
        }
      };

      mockSend.mockResolvedValueOnce({
        Body: mockStream,
        Metadata: { 'original-name': 'test.pdf' }
      });

      const result = await service.downloadFile('documents/test.pdf');

      expect(result.buffer).toBeDefined();
      expect(result.buffer.toString()).toBe('downloaded content');
      expect(result.metadata['original-name']).toBe('test.pdf');
    });

    it('should throw error for empty response', async () => {
      mockSend.mockResolvedValueOnce({ Body: null });

      await expect(
        service.downloadFile('missing/file.pdf')
      ).rejects.toThrow('Empty response body');
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      mockSend.mockResolvedValueOnce({
        ContentType: 'application/pdf',
        ContentLength: 1024,
        LastModified: new Date('2024-01-15'),
        Metadata: {
          'original-name': 'document.pdf',
          'checksum': 'abc123',
          'customer-id': 'cust-123'
        }
      });

      const result = await service.getFileMetadata('documents/doc.pdf');

      expect(result).toBeDefined();
      expect(result?.mimeType).toBe('application/pdf');
      expect(result?.size).toBe(1024);
      expect(result?.customerId).toBe('cust-123');
    });

    it('should return null on error', async () => {
      mockSend.mockRejectedValueOnce(new Error('Not found'));

      const result = await service.getFileMetadata('missing/file.pdf');

      expect(result).toBeNull();
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned download URL', async () => {
      mockGetSignedUrl.mockResolvedValueOnce('https://s3.example.com/signed-url');

      const url = await service.getPresignedUrl('documents/test.pdf', {
        expiresIn: 3600
      });

      expect(url).toBe('https://s3.example.com/signed-url');
      expect(mockGetSignedUrl).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete file and return true', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await service.deleteFile('documents/old-file.pdf');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should return false on error', async () => {
      mockSend.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await service.deleteFile('documents/protected.pdf');

      expect(result).toBe(false);
    });
  });

  describe('listFiles', () => {
    it('should list files with prefix', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: 'documents/file1.pdf', Size: 1024, LastModified: new Date(), ETag: '"abc"' },
          { Key: 'documents/file2.pdf', Size: 2048, LastModified: new Date(), ETag: '"def"' }
        ],
        NextContinuationToken: 'token123'
      });

      const result = await service.listFiles('documents/');

      expect(result.files).toHaveLength(2);
      expect(result.nextToken).toBe('token123');
    });

    it('should handle empty results', async () => {
      mockSend.mockResolvedValueOnce({ Contents: [] });

      const result = await service.listFiles('empty/');

      expect(result.files).toHaveLength(0);
    });
  });

  describe('isAvailable', () => {
    it('should return true when configured', () => {
      expect(service.isAvailable()).toBe(true);
    });
  });
});
