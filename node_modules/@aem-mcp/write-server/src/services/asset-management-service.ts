/**
 * Asset Management Service for AEMaaCS write operations
 * Handles asset uploads, updates, deletion, processing, and DAM folder management
 */

import { AEMHttpClient, RequestOptions } from '../../../shared/src/client/aem-http-client.js';
import { AEMResponse } from '../../../shared/src/types/aem.js';
import { Logger } from '../../../shared/src/utils/logger.js';
import { AEMException } from '../../../shared/src/utils/errors.js';

export interface AssetMetadata {
  'dc:title'?: string;
  'dc:description'?: string;
  'dc:subject'?: string[];
  'dc:creator'?: string;
  'dc:contributor'?: string[];
  'dc:rights'?: string;
  'dc:language'?: string;
  'cq:tags'?: string[];
  'dam:assetState'?: string;
  [key: string]: any;
}

export interface UploadAssetOptions {
  metadata?: AssetMetadata;
  overwrite?: boolean;
  createFolders?: boolean;
  processAsset?: boolean;
}

export interface UpdateAssetOptions {
  metadata?: AssetMetadata;
  fileContent?: Buffer;
  mimeType?: string;
  processAsset?: boolean;
}

export interface DeleteAssetOptions {
  force?: boolean;
  checkReferences?: boolean;
}

export interface ProcessAssetsOptions {
  profile?: string;
  async?: boolean;
  wait?: boolean;
}

export interface AssetOperationResult {
  success: boolean;
  path?: string;
  assetId?: string;
  message?: string;
  warnings?: string[];
  errors?: string[];
}

export interface UploadResult extends AssetOperationResult {
  fileName?: string;
  mimeType?: string;
  size?: number;
  renditions?: string[];
}

export interface ProcessResult extends AssetOperationResult {
  jobId?: string;
  status?: string;
  processedAssets?: number;
  failedAssets?: number;
}

export interface FolderResult extends AssetOperationResult {
  folderName?: string;
  folderType?: string;
}

export class AssetManagementService {
  private client: AEMHttpClient;
  private logger: Logger;

  constructor(client: AEMHttpClient) {
    this.client = client;
    this.logger = Logger.getInstance();
  }

  /**
   * Upload asset with metadata support
   */
  async uploadAsset(parentPath: string, fileName: string, fileContent: Buffer | File, options: UploadAssetOptions = {}): Promise<AEMResponse<UploadResult>> {
    try {
      this.logger.debug('Uploading asset', { parentPath, fileName, options });

      if (!parentPath || !fileName || !fileContent) {
        throw new AEMException(
          'Parent path, file name, and file content are required',
          'VALIDATION_ERROR',
          false
        );
      }

      // Validate parent path is in DAM
      if (!parentPath.startsWith('/content/dam/')) {
        throw new AEMException(
          'Parent path must be within DAM (/content/dam/)',
          'VALIDATION_ERROR',
          false
        );
      }

      // Validate file name
      if (!this.isValidFileName(fileName)) {
        throw new AEMException(
          'Invalid file name. File names must not contain special characters',
          'VALIDATION_ERROR',
          false
        );
      }

      // Create parent folders if needed
      if (options.createFolders) {
        await this.ensureFolderExists(parentPath);
      }

      const assetPath = `${parentPath}/${fileName}`;
      const formData = new FormData();
      
      // Add file content
      if (fileContent instanceof File) {
        formData.append('file', fileContent);
      } else {
        // Handle Buffer case
        const mimeType = this.guessMimeType(fileName);
        const blob = new Blob([fileContent], { type: mimeType });
        formData.append('file', blob, fileName);
      }
      
      // Add metadata
      if (options.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          if (value !== null && value !== undefined) {
            if (Array.isArray(value)) {
              value.forEach((item, index) => {
                formData.append(`${key}[${index}]`, item.toString());
              });
            } else {
              formData.append(key, value.toString());
            }
          }
        }
      }

      // Add upload options
      if (options.overwrite !== undefined) {
        formData.append(':replace', options.overwrite.toString());
      }

      if (options.processAsset !== undefined) {
        formData.append('processAsset', options.processAsset.toString());
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'uploadAsset',
          resource: assetPath
        }
      };

      const response = await this.client.upload<any>(
        `${parentPath}.createasset.html`,
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          'Failed to upload asset',
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result = this.parseUploadResponse(response.data, assetPath, fileName);

      this.logger.debug('Successfully uploaded asset', { 
        assetPath,
        fileName,
        mimeType: result.mimeType
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to upload asset', error as Error, { parentPath, fileName });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        'Unexpected error while uploading asset',
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, parentPath, fileName }
      );
    }
  }

  /**
   * Update asset metadata and content
   */
  async updateAsset(assetPath: string, options: UpdateAssetOptions = {}): Promise<AEMResponse<AssetOperationResult>> {
    try {
      this.logger.debug('Updating asset', { assetPath, options });

      if (!assetPath) {
        throw new AEMException(
          'Asset path is required',
          'VALIDATION_ERROR',
          false
        );
      }

      // Validate asset path is in DAM
      if (!assetPath.startsWith('/content/dam/')) {
        throw new AEMException(
          'Asset path must be within DAM (/content/dam/)',
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      
      // Add new file content if provided
      if (options.fileContent) {
        const fileName = assetPath.split('/').pop() || 'asset';
        const mimeType = options.mimeType || this.guessMimeType(fileName);
        const blob = new Blob([options.fileContent], { type: mimeType });
        formData.append('file', blob, fileName);
      }

      // Add metadata updates
      if (options.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          if (value !== null && value !== undefined) {
            if (Array.isArray(value)) {
              value.forEach((item, index) => {
                formData.append(`jcr:content/metadata/${key}[${index}]`, item.toString());
              });
            } else {
              formData.append(`jcr:content/metadata/${key}`, value.toString());
            }
          }
        }
      }

      if (options.processAsset !== undefined) {
        formData.append('processAsset', options.processAsset.toString());
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'updateAsset',
          resource: assetPath
        }
      };

      const response = await this.client.post<any>(
        assetPath,
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          `Failed to update asset: ${assetPath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result = this.parseAssetOperationResponse(response.data, assetPath);

      this.logger.debug('Successfully updated asset', { 
        assetPath,
        hasFileContent: !!options.fileContent,
        hasMetadata: !!options.metadata
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to update asset', error as Error, { assetPath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while updating asset: ${assetPath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, assetPath }
      );
    }
  }

  /**
   * Delete asset with safety checks
   */
  async deleteAsset(assetPath: string, options: DeleteAssetOptions = {}): Promise<AEMResponse<AssetOperationResult>> {
    try {
      this.logger.debug('Deleting asset', { assetPath, options });

      if (!assetPath) {
        throw new AEMException(
          'Asset path is required',
          'VALIDATION_ERROR',
          false
        );
      }

      // Validate asset path is in DAM
      if (!assetPath.startsWith('/content/dam/')) {
        throw new AEMException(
          'Asset path must be within DAM (/content/dam/)',
          'VALIDATION_ERROR',
          false
        );
      }

      // Safety check: prevent deletion of system assets
      if (this.isSystemAsset(assetPath)) {
        throw new AEMException(
          `Cannot delete system asset: ${assetPath}`,
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      formData.append(':operation', 'delete');

      if (options.force !== undefined) {
        formData.append('force', options.force.toString());
      }
      if (options.checkReferences !== undefined) {
        formData.append('checkReferences', options.checkReferences.toString());
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'deleteAsset',
          resource: assetPath
        }
      };

      const response = await this.client.post<any>(
        assetPath,
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          `Failed to delete asset: ${assetPath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result = this.parseAssetOperationResponse(response.data, assetPath);

      this.logger.debug('Successfully deleted asset', { 
        assetPath,
        success: result.success
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to delete asset', error as Error, { assetPath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while deleting asset: ${assetPath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, assetPath }
      );
    }
  }

  /**
   * Process assets for bulk asset processing
   */
  async processAssets(folderPath: string, options: ProcessAssetsOptions = {}): Promise<AEMResponse<ProcessResult>> {
    try {
      this.logger.debug('Processing assets', { folderPath, options });

      if (!folderPath) {
        throw new AEMException(
          'Folder path is required',
          'VALIDATION_ERROR',
          false
        );
      }

      // Validate folder path is in DAM
      if (!folderPath.startsWith('/content/dam/')) {
        throw new AEMException(
          'Folder path must be within DAM (/content/dam/)',
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      formData.append('optype', 'REPROCESS');
      formData.append('path', folderPath);
      
      if (options.profile) {
        formData.append('profile', options.profile);
      } else {
        formData.append('profile', 'dam/update_asset');
      }

      if (options.async !== undefined) {
        formData.append('async', options.async.toString());
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'processAssets',
          resource: folderPath
        }
      };

      const response = await this.client.post<any>(
        '/bin/asynccommand',
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          `Failed to process assets: ${folderPath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result = this.parseProcessResponse(response.data, folderPath, options.async);

      this.logger.debug('Successfully initiated asset processing', { 
        folderPath,
        jobId: result.jobId,
        async: options.async
      });

      // If wait option is true and async is true, poll for completion
      if (options.wait && options.async) {
        await this.waitForProcessCompletion(result.jobId!);
        result.status = 'COMPLETED';
      }

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to process assets', error as Error, { folderPath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while processing assets: ${folderPath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, folderPath }
      );
    }
  }

  /**
   * Create asset folder for DAM organization
   */
  async createAssetFolder(parentPath: string, folderName: string, metadata: Record<string, any> = {}): Promise<AEMResponse<FolderResult>> {
    try {
      this.logger.debug('Creating asset folder', { parentPath, folderName, metadata });

      if (!parentPath || !folderName) {
        throw new AEMException(
          'Parent path and folder name are required',
          'VALIDATION_ERROR',
          false
        );
      }

      // Validate parent path is in DAM
      if (!parentPath.startsWith('/content/dam/')) {
        throw new AEMException(
          'Parent path must be within DAM (/content/dam/)',
          'VALIDATION_ERROR',
          false
        );
      }

      // Validate folder name
      if (!this.isValidFolderName(folderName)) {
        throw new AEMException(
          'Invalid folder name. Folder names must not contain special characters',
          'VALIDATION_ERROR',
          false
        );
      }

      const folderPath = `${parentPath}/${folderName}`;
      const formData = new FormData();
      
      // Set primary type for DAM folder
      formData.append('jcr:primaryType', 'sling:Folder');
      formData.append('jcr:content/jcr:primaryType', 'dam:AssetContent');
      
      // Add folder metadata
      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          if (value !== null && value !== undefined) {
            if (Array.isArray(value)) {
              value.forEach((item, index) => {
                formData.append(`jcr:content/${key}[${index}]`, item.toString());
              });
            } else {
              formData.append(`jcr:content/${key}`, value.toString());
            }
          }
        }
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'createAssetFolder',
          resource: folderPath
        }
      };

      const response = await this.client.post<any>(
        folderPath,
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          'Failed to create asset folder',
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result = this.parseFolderResponse(response.data, folderPath, folderName);

      this.logger.debug('Successfully created asset folder', { 
        folderPath,
        folderName
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to create asset folder', error as Error, { parentPath, folderName });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        'Unexpected error while creating asset folder',
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, parentPath, folderName }
      );
    }
  }

  /**
   * Parse asset operation response
   */
  private parseAssetOperationResponse(data: any, path: string): AssetOperationResult {
    return {
      success: Boolean(data.success !== false),
      path: data.path || path,
      assetId: data.assetId || data.id,
      message: data.message || data.msg,
      warnings: Array.isArray(data.warnings) ? data.warnings : (data.warning ? [data.warning] : []),
      errors: Array.isArray(data.errors) ? data.errors : (data.error ? [data.error] : [])
    };
  }

  /**
   * Parse upload response
   */
  private parseUploadResponse(data: any, path: string, fileName: string): UploadResult {
    return {
      success: Boolean(data.success !== false),
      path: data.path || path,
      fileName: fileName,
      mimeType: data.mimeType || this.guessMimeType(fileName),
      size: data.size ? parseInt(data.size) : undefined,
      renditions: Array.isArray(data.renditions) ? data.renditions : undefined,
      message: data.message || data.msg,
      warnings: Array.isArray(data.warnings) ? data.warnings : (data.warning ? [data.warning] : []),
      errors: Array.isArray(data.errors) ? data.errors : (data.error ? [data.error] : [])
    };
  }

  /**
   * Parse process response
   */
  private parseProcessResponse(data: any, folderPath: string, async?: boolean): ProcessResult {
    return {
      success: Boolean(data.success !== false),
      path: data.path || folderPath,
      jobId: data.jobId || data.id,
      status: async ? 'INITIATED' : 'COMPLETED',
      processedAssets: data.processedAssets ? parseInt(data.processedAssets) : undefined,
      failedAssets: data.failedAssets ? parseInt(data.failedAssets) : undefined,
      message: data.message || data.msg,
      warnings: Array.isArray(data.warnings) ? data.warnings : (data.warning ? [data.warning] : []),
      errors: Array.isArray(data.errors) ? data.errors : (data.error ? [data.error] : [])
    };
  }

  /**
   * Parse folder response
   */
  private parseFolderResponse(data: any, path: string, folderName: string): FolderResult {
    return {
      success: Boolean(data.success !== false),
      path: data.path || path,
      folderName: folderName,
      folderType: 'dam:AssetContent',
      message: data.message || data.msg,
      warnings: Array.isArray(data.warnings) ? data.warnings : (data.warning ? [data.warning] : []),
      errors: Array.isArray(data.errors) ? data.errors : (data.error ? [data.error] : [])
    };
  }

  /**
   * Validate file name
   */
  private isValidFileName(fileName: string): boolean {
    // DAM file name restrictions
    const invalidChars = /[<>:"/\\|?*\[\]]/;
    const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
    
    return !invalidChars.test(fileName) && 
           !reservedNames.includes(fileName.toLowerCase()) &&
           fileName.length > 0 &&
           fileName.length <= 255 &&
           !fileName.startsWith('.') &&
           !fileName.endsWith('.');
  }

  /**
   * Validate folder name
   */
  private isValidFolderName(folderName: string): boolean {
    // DAM folder name restrictions
    const invalidChars = /[<>:"/\\|?*\[\]]/;
    const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
    
    return !invalidChars.test(folderName) && 
           !reservedNames.includes(folderName.toLowerCase()) &&
           folderName.length > 0 &&
           folderName.length <= 150 &&
           !folderName.startsWith('.') &&
           !folderName.endsWith('.');
  }

  /**
   * Check if asset is a system asset that should not be deleted
   */
  private isSystemAsset(assetPath: string): boolean {
    const systemAssetPaths = [
      '/content/dam/system',
      '/content/dam/projects',
      '/content/dam/collections'
    ];

    return systemAssetPaths.some(path => assetPath.startsWith(path)) ||
           assetPath === '/content/dam' ||
           assetPath.split('/').length <= 3; // Protect root level assets
  }

  /**
   * Guess MIME type from file name
   */
  private guessMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'tif': 'image/tiff',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'flac': 'audio/flac',
      'aac': 'audio/aac',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml'
    };
    
    return extension && mimeTypes[extension] ? mimeTypes[extension] : 'application/octet-stream';
  }

  /**
   * Ensure folder exists, creating parent folders as needed
   */
  private async ensureFolderExists(folderPath: string): Promise<void> {
    try {
      // Check if folder exists
      const response = await this.client.get<any>(`${folderPath}.json`);
      if (response.success) {
        return; // Folder exists
      }
    } catch (error) {
      // Folder doesn't exist, create it
      const pathParts = folderPath.replace('/content/dam/', '').split('/').filter(part => part);
      let currentPath = '/content/dam';
      
      for (let i = 0; i < pathParts.length; i++) {
        currentPath += '/' + pathParts[i];
        
        try {
          // Check if this part exists
          const checkResponse = await this.client.get<any>(`${currentPath}.json`);
          if (!checkResponse.success) {
            throw new Error('Path does not exist');
          }
        } catch (error) {
          // Create this folder
          await this.createAssetFolder(currentPath.substring(0, currentPath.lastIndexOf('/')), pathParts[i]);
        }
      }
    }
  }

  /**
   * Wait for process completion
   */
  private async waitForProcessCompletion(jobId: string, maxAttempts: number = 30, delayMs: number = 2000): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.client.get<any>(`/mnt/overlay/granite/async/content/asyncjobs/${jobId}.json`);
        
        if (response.success && response.data) {
          const status = response.data.status;
          if (status === 'COMPLETED' || status === 'FAILED') {
            return; // Processing complete
          }
        }
      } catch (error) {
        this.logger.warn('Error checking process status', error as Error);
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    this.logger.warn(`Asset processing timed out after ${maxAttempts} attempts`);
  }
}