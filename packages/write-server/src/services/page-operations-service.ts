/**
 * Page Operations Service for AEMaaCS write operations
 * Handles page creation, copying, moving, deletion, locking, and property updates
 */

import { AEMHttpClient, RequestOptions } from '../../../shared/src/client/aem-http-client.js';
import { AEMResponse } from '../../../shared/src/types/aem.js';
import { Logger } from '../../../shared/src/utils/logger.js';
import { AEMException } from '../../../shared/src/utils/errors.js';

export interface CreatePageOptions {
  template: string;
  title?: string;
  description?: string;
  tags?: string[];
  properties?: Record<string, any>;
  parentResourceType?: string;
}

export interface CopyPageOptions {
  shallow?: boolean;
  destName?: string;
  updateReferences?: boolean;
  adjustTimestamp?: boolean;
}

export interface MovePageOptions {
  destName?: string;
  adjustTimestamp?: boolean;
  updateReferences?: boolean;
  force?: boolean;
}

export interface DeletePageOptions {
  force?: boolean;
  checkReferences?: boolean;
}

export interface UpdatePagePropertiesOptions {
  merge?: boolean;
  replaceProperties?: boolean;
}

export interface PageOperationResult {
  success: boolean;
  path?: string;
  message?: string;
  warnings?: string[];
  errors?: string[];
}

export interface LockResult extends PageOperationResult {
  lockOwner?: string;
  lockCreated?: Date;
  lockDeep?: boolean;
}

export interface UnlockResult extends PageOperationResult {
  wasLocked?: boolean;
  previousOwner?: string;
}

export interface BulkMoveOptions {
  updateReferences?: boolean;
  adjustTimestamp?: boolean;
  force?: boolean;
  batchSize?: number;
}

export interface BulkMoveResult {
  totalPages: number;
  successfulMoves: number;
  failedMoves: number;
  results: Array<{
    srcPath: string;
    destPath: string;
    success: boolean;
    error?: string;
  }>;
}

export class PageOperationsService {
  private client: AEMHttpClient;
  private logger: Logger;

  constructor(client: AEMHttpClient) {
    this.client = client;
    this.logger = Logger.getInstance();
  }

  /**
   * Create page with template integration
   */
  async createPage(parentPath: string, pageName: string, options: CreatePageOptions): Promise<AEMResponse<PageOperationResult>> {
    try {
      this.logger.debug('Creating page', { parentPath, pageName, options });

      if (!parentPath || !pageName || !options.template) {
        throw new AEMException(
          'Parent path, page name, and template are required',
          'VALIDATION_ERROR',
          false
        );
      }

      // Validate page name
      if (!this.isValidPageName(pageName)) {
        throw new AEMException(
          'Invalid page name. Page names must not contain special characters',
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      formData.append('cmd', 'createPage');
      formData.append('template', options.template);
      formData.append('parentPath', parentPath);
      formData.append('title', options.title || pageName);
      formData.append('label', pageName);

      if (options.description) {
        formData.append('description', options.description);
      }
      if (options.tags && options.tags.length > 0) {
        formData.append('tags', options.tags.join(','));
      }
      if (options.parentResourceType) {
        formData.append('parentResourceType', options.parentResourceType);
      }
      if (options.properties) {
        for (const [key, value] of Object.entries(options.properties)) {
          formData.append(`property.${key}`, value.toString());
        }
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'createPage',
          resource: `${parentPath}/${pageName}`
        }
      };

      const response = await this.client.post<any>(
        '/bin/wcmcommand',
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          'Failed to create page',
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result = this.parsePageOperationResponse(response.data, `${parentPath}/${pageName}`);

      this.logger.debug('Successfully created page', { 
        parentPath,
        pageName,
        path: result.path
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
      this.logger.error('Failed to create page', error as Error, { parentPath, pageName });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        'Unexpected error while creating page',
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, parentPath, pageName }
      );
    }
  }

  /**
   * Copy page using /bin/wcmcommand
   */
  async copyPage(srcPath: string, destParentPath: string, options: CopyPageOptions = {}): Promise<AEMResponse<PageOperationResult>> {
    try {
      this.logger.debug('Copying page', { srcPath, destParentPath, options });

      if (!srcPath || !destParentPath) {
        throw new AEMException(
          'Source path and destination parent path are required',
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      formData.append('cmd', 'copyPage');
      formData.append('srcPath', srcPath);
      formData.append('destParentPath', destParentPath);

      if (options.destName) {
        formData.append('destName', options.destName);
      }
      if (options.shallow !== undefined) {
        formData.append('shallow', options.shallow.toString());
      }
      if (options.updateReferences !== undefined) {
        formData.append('updateReferences', options.updateReferences.toString());
      }
      if (options.adjustTimestamp !== undefined) {
        formData.append('adjustTimestamp', options.adjustTimestamp.toString());
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'copyPage',
          resource: srcPath
        }
      };

      const response = await this.client.post<any>(
        '/bin/wcmcommand',
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          `Failed to copy page: ${srcPath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const destName = options.destName || srcPath.split('/').pop();
      const destPath = `${destParentPath}/${destName}`;
      const result = this.parsePageOperationResponse(response.data, destPath);

      this.logger.debug('Successfully copied page', { 
        srcPath,
        destPath: result.path
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
      this.logger.error('Failed to copy page', error as Error, { srcPath, destParentPath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while copying page: ${srcPath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, srcPath, destParentPath }
      );
    }
  }

  /**
   * Move page with bulk operation support
   */
  async movePage(srcPath: string, destParentPath: string, options: MovePageOptions = {}): Promise<AEMResponse<PageOperationResult>> {
    try {
      this.logger.debug('Moving page', { srcPath, destParentPath, options });

      if (!srcPath || !destParentPath) {
        throw new AEMException(
          'Source path and destination parent path are required',
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      formData.append('cmd', 'movePage');
      formData.append('srcPath', srcPath);
      formData.append('destParentPath', destParentPath);

      if (options.destName) {
        formData.append('destName', options.destName);
      }
      if (options.adjustTimestamp !== undefined) {
        formData.append('adjustTimestamp', options.adjustTimestamp.toString());
      }
      if (options.updateReferences !== undefined) {
        formData.append('updateReferences', options.updateReferences.toString());
      }
      if (options.force !== undefined) {
        formData.append('force', options.force.toString());
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'movePage',
          resource: srcPath
        }
      };

      const response = await this.client.post<any>(
        '/bin/wcmcommand',
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          `Failed to move page: ${srcPath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const destName = options.destName || srcPath.split('/').pop();
      const destPath = `${destParentPath}/${destName}`;
      const result = this.parsePageOperationResponse(response.data, destPath);

      this.logger.debug('Successfully moved page', { 
        srcPath,
        destPath: result.path
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
      this.logger.error('Failed to move page', error as Error, { srcPath, destParentPath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while moving page: ${srcPath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, srcPath, destParentPath }
      );
    }
  }

  /**
   * Move multiple pages in bulk
   */
  async bulkMovePage(moves: Array<{srcPath: string, destParentPath: string, destName?: string}>, options: BulkMoveOptions = {}): Promise<AEMResponse<BulkMoveResult>> {
    try {
      this.logger.debug('Bulk moving pages', { moveCount: moves.length, options });

      if (!moves || moves.length === 0) {
        throw new AEMException(
          'At least one page move operation is required',
          'VALIDATION_ERROR',
          false
        );
      }

      const batchSize = options.batchSize || 10;
      const results: BulkMoveResult['results'] = [];
      let successfulMoves = 0;
      let failedMoves = 0;

      // Process moves in batches
      for (let i = 0; i < moves.length; i += batchSize) {
        const batch = moves.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (move) => {
          try {
            const moveOptions: MovePageOptions = {
              destName: move.destName,
              updateReferences: options.updateReferences,
              adjustTimestamp: options.adjustTimestamp,
              force: options.force
            };

            const result = await this.movePage(move.srcPath, move.destParentPath, moveOptions);
            
            successfulMoves++;
            return {
              srcPath: move.srcPath,
              destPath: result.data!.path || `${move.destParentPath}/${move.destName || move.srcPath.split('/').pop()}`,
              success: true
            };
          } catch (error) {
            failedMoves++;
            return {
              srcPath: move.srcPath,
              destPath: `${move.destParentPath}/${move.destName || move.srcPath.split('/').pop()}`,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const bulkResult: BulkMoveResult = {
        totalPages: moves.length,
        successfulMoves,
        failedMoves,
        results
      };

      this.logger.debug('Successfully completed bulk page move', { 
        totalPages: moves.length,
        successfulMoves,
        failedMoves
      });

      return {
        success: true,
        data: bulkResult,
        metadata: {
          timestamp: new Date(),
          requestId: '',
          duration: 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to bulk move pages', error as Error);
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        'Unexpected error while bulk moving pages',
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Delete page with force option and safety checks
   */
  async deletePage(pagePath: string, options: DeletePageOptions = {}): Promise<AEMResponse<PageOperationResult>> {
    try {
      this.logger.debug('Deleting page', { pagePath, options });

      if (!pagePath) {
        throw new AEMException(
          'Page path is required',
          'VALIDATION_ERROR',
          false
        );
      }

      // Safety check: prevent deletion of important system pages
      if (this.isSystemPage(pagePath)) {
        throw new AEMException(
          `Cannot delete system page: ${pagePath}`,
          'VALIDATION_ERROR',
          false,
          undefined,
          { pagePath }
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
          operation: 'deletePage',
          resource: pagePath
        }
      };

      const response = await this.client.post<any>(
        pagePath,
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          `Failed to delete page: ${pagePath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result = this.parsePageOperationResponse(response.data, pagePath);

      this.logger.debug('Successfully deleted page', { 
        pagePath,
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
      this.logger.error('Failed to delete page', error as Error, { pagePath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while deleting page: ${pagePath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, pagePath }
      );
    }
  }

  /**
   * Lock page
   */
  async lockPage(pagePath: string, deep: boolean = false): Promise<AEMResponse<LockResult>> {
    try {
      this.logger.debug('Locking page', { pagePath, deep });

      if (!pagePath) {
        throw new AEMException(
          'Page path is required',
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      formData.append('cmd', 'lockPage');
      formData.append('path', pagePath);
      
      if (deep) {
        formData.append('deep', 'true');
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'lockPage',
          resource: pagePath
        }
      };

      const response = await this.client.post<any>(
        '/bin/wcmcommand',
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          `Failed to lock page: ${pagePath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result = this.parseLockResponse(response.data, pagePath, deep);

      this.logger.debug('Successfully locked page', { 
        pagePath,
        lockOwner: result.lockOwner
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
      this.logger.error('Failed to lock page', error as Error, { pagePath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while locking page: ${pagePath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, pagePath }
      );
    }
  }

  /**
   * Unlock page
   */
  async unlockPage(pagePath: string, force: boolean = false): Promise<AEMResponse<UnlockResult>> {
    try {
      this.logger.debug('Unlocking page', { pagePath, force });

      if (!pagePath) {
        throw new AEMException(
          'Page path is required',
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      formData.append('cmd', 'unlockPage');
      formData.append('path', pagePath);
      
      if (force) {
        formData.append('force', 'true');
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'unlockPage',
          resource: pagePath
        }
      };

      const response = await this.client.post<any>(
        '/bin/wcmcommand',
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          `Failed to unlock page: ${pagePath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result = this.parseUnlockResponse(response.data, pagePath);

      this.logger.debug('Successfully unlocked page', { 
        pagePath,
        wasLocked: result.wasLocked
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
      this.logger.error('Failed to unlock page', error as Error, { pagePath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while unlocking page: ${pagePath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, pagePath }
      );
    }
  }

  /**
   * Update page properties for metadata updates
   */
  async updatePageProperties(pagePath: string, properties: Record<string, any>, options: UpdatePagePropertiesOptions = {}): Promise<AEMResponse<PageOperationResult>> {
    try {
      this.logger.debug('Updating page properties', { pagePath, properties, options });

      if (!pagePath || !properties || Object.keys(properties).length === 0) {
        throw new AEMException(
          'Page path and properties are required',
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      
      // Add properties to form data
      for (const [key, value] of Object.entries(properties)) {
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

      // Add options
      if (options.merge !== undefined) {
        formData.append(':merge', options.merge.toString());
      }
      if (options.replaceProperties !== undefined) {
        formData.append(':replace', options.replaceProperties.toString());
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'updatePageProperties',
          resource: `${pagePath}/jcr:content`
        }
      };

      const response = await this.client.post<any>(
        `${pagePath}/jcr:content`,
        formData as any,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          `Failed to update page properties: ${pagePath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result = this.parsePageOperationResponse(response.data, pagePath);

      this.logger.debug('Successfully updated page properties', { 
        pagePath,
        propertyCount: Object.keys(properties).length
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
      this.logger.error('Failed to update page properties', error as Error, { pagePath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while updating page properties: ${pagePath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, pagePath }
      );
    }
  }

  /**
   * Parse page operation response
   */
  private parsePageOperationResponse(data: any, path: string): PageOperationResult {
    return {
      success: Boolean(data.success !== false),
      path: data.path || path,
      message: data.message || data.msg,
      warnings: Array.isArray(data.warnings) ? data.warnings : (data.warning ? [data.warning] : []),
      errors: Array.isArray(data.errors) ? data.errors : (data.error ? [data.error] : [])
    };
  }

  /**
   * Parse lock response
   */
  private parseLockResponse(data: any, path: string, deep: boolean): LockResult {
    return {
      success: Boolean(data.success !== false),
      path,
      message: data.message || data.msg,
      lockOwner: data.lockOwner || data.owner,
      lockCreated: data.lockCreated ? new Date(data.lockCreated) : new Date(),
      lockDeep: deep,
      warnings: Array.isArray(data.warnings) ? data.warnings : (data.warning ? [data.warning] : []),
      errors: Array.isArray(data.errors) ? data.errors : (data.error ? [data.error] : [])
    };
  }

  /**
   * Parse unlock response
   */
  private parseUnlockResponse(data: any, path: string): UnlockResult {
    return {
      success: Boolean(data.success !== false),
      path,
      message: data.message || data.msg,
      wasLocked: Boolean(data.wasLocked),
      previousOwner: data.previousOwner || data.owner,
      warnings: Array.isArray(data.warnings) ? data.warnings : (data.warning ? [data.warning] : []),
      errors: Array.isArray(data.errors) ? data.errors : (data.error ? [data.error] : [])
    };
  }

  /**
   * Validate page name
   */
  private isValidPageName(pageName: string): boolean {
    // AEM page name restrictions
    const invalidChars = /[<>:"/\\|?*\[\]]/;
    const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
    
    return !invalidChars.test(pageName) && 
           !reservedNames.includes(pageName.toLowerCase()) &&
           pageName.length > 0 &&
           pageName.length <= 150 &&
           !pageName.startsWith('.') &&
           !pageName.endsWith('.');
  }

  /**
   * Check if page is a system page that should not be deleted
   */
  private isSystemPage(pagePath: string): boolean {
    const systemPagePrefixes = [
      '/content/dam',
      '/content/experience-fragments',
      '/content/forms',
      '/content/screens',
      '/content/communities',
      '/content/catalogs',
      '/content/campaigns',
      '/content/launches',
      '/content/projects',
      '/content/publications',
      '/content/usergenerated',
      '/etc',
      '/apps',
      '/libs',
      '/var',
      '/tmp',
      '/home'
    ];

    return systemPagePrefixes.some(prefix => pagePath.startsWith(prefix)) ||
           pagePath === '/content' ||
           pagePath.split('/').length <= 2; // Protect root level pages
  }
}