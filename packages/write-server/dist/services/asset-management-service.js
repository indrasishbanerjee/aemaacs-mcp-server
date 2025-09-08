"use strict";
/**
 * Asset Management Service for AEMaaCS write operations
 * Handles asset uploads, updates, deletion, processing, and DAM folder management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetManagementService = void 0;
const logger_js_1 = require("../../../shared/src/utils/logger.js");
const errors_js_1 = require("../../../shared/src/utils/errors.js");
class AssetManagementService {
    constructor(client) {
        this.client = client;
        this.logger = logger_js_1.Logger.getInstance();
    }
    /**
     * Upload asset with metadata support
     */
    async uploadAsset(parentPath, fileName, fileContent, options = {}) {
        try {
            this.logger.debug('Uploading asset', { parentPath, fileName, options });
            if (!parentPath || !fileName || !fileContent) {
                throw new errors_js_1.AEMException('Parent path, file name, and file content are required', 'VALIDATION_ERROR', false);
            }
            // Validate parent path is in DAM
            if (!parentPath.startsWith('/content/dam/')) {
                throw new errors_js_1.AEMException('Parent path must be within DAM (/content/dam/)', 'VALIDATION_ERROR', false);
            }
            // Validate file name
            if (!this.isValidFileName(fileName)) {
                throw new errors_js_1.AEMException('Invalid file name. File names must not contain special characters', 'VALIDATION_ERROR', false);
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
            }
            else {
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
                        }
                        else {
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
            const requestOptions = {
                context: {
                    operation: 'uploadAsset',
                    resource: assetPath
                }
            };
            const response = await this.client.upload(`${parentPath}.createasset.html`, formData, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException('Failed to upload asset', 'SERVER_ERROR', true, undefined, { response });
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
        }
        catch (error) {
            this.logger.error('Failed to upload asset', error, { parentPath, fileName });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException('Unexpected error while uploading asset', 'UNKNOWN_ERROR', false, undefined, { originalError: error, parentPath, fileName });
        }
    }
    /**
     * Update asset metadata and content
     */
    async updateAsset(assetPath, options = {}) {
        try {
            this.logger.debug('Updating asset', { assetPath, options });
            if (!assetPath) {
                throw new errors_js_1.AEMException('Asset path is required', 'VALIDATION_ERROR', false);
            }
            // Validate asset path is in DAM
            if (!assetPath.startsWith('/content/dam/')) {
                throw new errors_js_1.AEMException('Asset path must be within DAM (/content/dam/)', 'VALIDATION_ERROR', false);
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
                        }
                        else {
                            formData.append(`jcr:content/metadata/${key}`, value.toString());
                        }
                    }
                }
            }
            if (options.processAsset !== undefined) {
                formData.append('processAsset', options.processAsset.toString());
            }
            const requestOptions = {
                context: {
                    operation: 'updateAsset',
                    resource: assetPath
                }
            };
            const response = await this.client.post(assetPath, formData, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Failed to update asset: ${assetPath}`, 'SERVER_ERROR', true, undefined, { response });
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
        }
        catch (error) {
            this.logger.error('Failed to update asset', error, { assetPath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while updating asset: ${assetPath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, assetPath });
        }
    }
    /**
     * Delete asset with safety checks
     */
    async deleteAsset(assetPath, options = {}) {
        try {
            this.logger.debug('Deleting asset', { assetPath, options });
            if (!assetPath) {
                throw new errors_js_1.AEMException('Asset path is required', 'VALIDATION_ERROR', false);
            }
            // Validate asset path is in DAM
            if (!assetPath.startsWith('/content/dam/')) {
                throw new errors_js_1.AEMException('Asset path must be within DAM (/content/dam/)', 'VALIDATION_ERROR', false);
            }
            // Safety check: prevent deletion of system assets
            if (this.isSystemAsset(assetPath)) {
                throw new errors_js_1.AEMException(`Cannot delete system asset: ${assetPath}`, 'VALIDATION_ERROR', false);
            }
            const formData = new FormData();
            formData.append(':operation', 'delete');
            if (options.force !== undefined) {
                formData.append('force', options.force.toString());
            }
            if (options.checkReferences !== undefined) {
                formData.append('checkReferences', options.checkReferences.toString());
            }
            const requestOptions = {
                context: {
                    operation: 'deleteAsset',
                    resource: assetPath
                }
            };
            const response = await this.client.post(assetPath, formData, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Failed to delete asset: ${assetPath}`, 'SERVER_ERROR', true, undefined, { response });
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
        }
        catch (error) {
            this.logger.error('Failed to delete asset', error, { assetPath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while deleting asset: ${assetPath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, assetPath });
        }
    }
    /**
     * Process assets for bulk asset processing
     */
    async processAssets(folderPath, options = {}) {
        try {
            this.logger.debug('Processing assets', { folderPath, options });
            if (!folderPath) {
                throw new errors_js_1.AEMException('Folder path is required', 'VALIDATION_ERROR', false);
            }
            // Validate folder path is in DAM
            if (!folderPath.startsWith('/content/dam/')) {
                throw new errors_js_1.AEMException('Folder path must be within DAM (/content/dam/)', 'VALIDATION_ERROR', false);
            }
            const formData = new FormData();
            formData.append('optype', 'REPROCESS');
            formData.append('path', folderPath);
            if (options.profile) {
                formData.append('profile', options.profile);
            }
            else {
                formData.append('profile', 'dam/update_asset');
            }
            if (options.async !== undefined) {
                formData.append('async', options.async.toString());
            }
            const requestOptions = {
                context: {
                    operation: 'processAssets',
                    resource: folderPath
                }
            };
            const response = await this.client.post('/bin/asynccommand', formData, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Failed to process assets: ${folderPath}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const result = this.parseProcessResponse(response.data, folderPath, options.async);
            this.logger.debug('Successfully initiated asset processing', {
                folderPath,
                jobId: result.jobId,
                async: options.async
            });
            // If wait option is true and async is true, poll for completion
            if (options.wait && options.async) {
                await this.waitForProcessCompletion(result.jobId);
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
        }
        catch (error) {
            this.logger.error('Failed to process assets', error, { folderPath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while processing assets: ${folderPath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, folderPath });
        }
    }
    /**
     * Create asset folder for DAM organization
     */
    async createAssetFolder(parentPath, folderName, metadata = {}) {
        try {
            this.logger.debug('Creating asset folder', { parentPath, folderName, metadata });
            if (!parentPath || !folderName) {
                throw new errors_js_1.AEMException('Parent path and folder name are required', 'VALIDATION_ERROR', false);
            }
            // Validate parent path is in DAM
            if (!parentPath.startsWith('/content/dam/')) {
                throw new errors_js_1.AEMException('Parent path must be within DAM (/content/dam/)', 'VALIDATION_ERROR', false);
            }
            // Validate folder name
            if (!this.isValidFolderName(folderName)) {
                throw new errors_js_1.AEMException('Invalid folder name. Folder names must not contain special characters', 'VALIDATION_ERROR', false);
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
                        }
                        else {
                            formData.append(`jcr:content/${key}`, value.toString());
                        }
                    }
                }
            }
            const requestOptions = {
                context: {
                    operation: 'createAssetFolder',
                    resource: folderPath
                }
            };
            const response = await this.client.post(folderPath, formData, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException('Failed to create asset folder', 'SERVER_ERROR', true, undefined, { response });
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
        }
        catch (error) {
            this.logger.error('Failed to create asset folder', error, { parentPath, folderName });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException('Unexpected error while creating asset folder', 'UNKNOWN_ERROR', false, undefined, { originalError: error, parentPath, folderName });
        }
    }
    /**
     * Parse asset operation response
     */
    parseAssetOperationResponse(data, path) {
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
    parseUploadResponse(data, path, fileName) {
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
    parseProcessResponse(data, folderPath, async) {
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
    parseFolderResponse(data, path, folderName) {
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
    isValidFileName(fileName) {
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
    isValidFolderName(folderName) {
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
    isSystemAsset(assetPath) {
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
    guessMimeType(fileName) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const mimeTypes = {
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
    async ensureFolderExists(folderPath) {
        try {
            // Check if folder exists
            const response = await this.client.get(`${folderPath}.json`);
            if (response.success) {
                return; // Folder exists
            }
        }
        catch (error) {
            // Folder doesn't exist, create it
            const pathParts = folderPath.replace('/content/dam/', '').split('/').filter(part => part);
            let currentPath = '/content/dam';
            for (let i = 0; i < pathParts.length; i++) {
                currentPath += '/' + pathParts[i];
                try {
                    // Check if this part exists
                    const checkResponse = await this.client.get(`${currentPath}.json`);
                    if (!checkResponse.success) {
                        throw new Error('Path does not exist');
                    }
                }
                catch (error) {
                    // Create this folder
                    await this.createAssetFolder(currentPath.substring(0, currentPath.lastIndexOf('/')), pathParts[i]);
                }
            }
        }
    }
    /**
     * Wait for process completion
     */
    async waitForProcessCompletion(jobId, maxAttempts = 30, delayMs = 2000) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const response = await this.client.get(`/mnt/overlay/granite/async/content/asyncjobs/${jobId}.json`);
                if (response.success && response.data) {
                    const status = response.data.status;
                    if (status === 'COMPLETED' || status === 'FAILED') {
                        return; // Processing complete
                    }
                }
            }
            catch (error) {
                this.logger.warn('Error checking process status', error);
            }
            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        this.logger.warn(`Asset processing timed out after ${maxAttempts} attempts`);
    }
}
exports.AssetManagementService = AssetManagementService;
//# sourceMappingURL=asset-management-service.js.map