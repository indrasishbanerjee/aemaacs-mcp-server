"use strict";
/**
 * Content Fragment Operations Service for AEMaaCS write operations
 * Handles content fragment creation, updating, and deletion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentFragmentOperationsService = void 0;
const logger_js_1 = require("../../../shared/src/utils/logger.js");
const errors_js_1 = require("../../../shared/src/utils/errors.js");
class ContentFragmentOperationsService {
    constructor(client) {
        this.client = client;
        this.logger = logger_js_1.Logger.getInstance();
    }
    /**
     * Create content fragment using /api/assets/
     */
    async createContentFragment(parentPath, fragmentName, options) {
        try {
            this.logger.debug('Creating content fragment', { parentPath, fragmentName, options });
            if (!parentPath || !fragmentName || !options.model || !options.title) {
                throw new errors_js_1.AEMException('Parent path, fragment name, model, and title are required', 'VALIDATION_ERROR', false);
            }
            // Validate fragment name
            if (!this.isValidFragmentName(fragmentName)) {
                throw new errors_js_1.AEMException('Invalid fragment name. Fragment names must not contain special characters', 'VALIDATION_ERROR', false);
            }
            // Validate parent path is in DAM
            if (!parentPath.startsWith('/content/dam/')) {
                throw new errors_js_1.AEMException('Content fragments must be created in DAM (/content/dam/)', 'VALIDATION_ERROR', false);
            }
            const fragmentPath = `${parentPath}/${fragmentName}`;
            const payload = {
                'jcr:primaryType': 'dam:Asset',
                'jcr:content': {
                    'jcr:primaryType': 'dam:AssetContent',
                    'contentFragment': true,
                    'cq:model': options.model,
                    'jcr:title': options.title,
                    'jcr:description': options.description || '',
                    'cq:tags': options.tags || [],
                    'data': {
                        'jcr:primaryType': 'nt:unstructured',
                        'cq:model': options.model,
                        ...this.formatFragmentElements(options.elements || {})
                    },
                    ...options.properties
                }
            };
            const requestOptions = {
                context: {
                    operation: 'createContentFragment',
                    resource: fragmentPath
                }
            };
            const response = await this.client.post(`/api/assets${fragmentPath}`, payload, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException('Failed to create content fragment', 'SERVER_ERROR', true, undefined, { response });
            }
            const result = this.parseContentFragmentOperationResponse(response.data, fragmentPath);
            this.logger.debug('Successfully created content fragment', {
                fragmentPath,
                model: options.model
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
            this.logger.error('Failed to create content fragment', error, { parentPath, fragmentName });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException('Unexpected error while creating content fragment', 'UNKNOWN_ERROR', false, undefined, { originalError: error, parentPath, fragmentName });
        }
    }
    /**
     * Update content fragment for element updates
     */
    async updateContentFragment(fragmentPath, options) {
        try {
            this.logger.debug('Updating content fragment', { fragmentPath, options });
            if (!fragmentPath) {
                throw new errors_js_1.AEMException('Fragment path is required', 'VALIDATION_ERROR', false);
            }
            // Validate fragment path is in DAM
            if (!fragmentPath.startsWith('/content/dam/')) {
                throw new errors_js_1.AEMException('Content fragment path must be in DAM (/content/dam/)', 'VALIDATION_ERROR', false);
            }
            const payload = {};
            // Update basic properties
            if (options.title !== undefined) {
                payload['jcr:title'] = options.title;
            }
            if (options.description !== undefined) {
                payload['jcr:description'] = options.description;
            }
            if (options.tags !== undefined) {
                payload['cq:tags'] = options.tags;
            }
            // Update elements
            if (options.elements) {
                payload.data = {
                    ...this.formatFragmentElements(options.elements)
                };
            }
            // Add custom properties
            if (options.properties) {
                Object.assign(payload, options.properties);
            }
            const requestOptions = {
                context: {
                    operation: 'updateContentFragment',
                    resource: fragmentPath
                }
            };
            const response = await this.client.put(`/api/assets${fragmentPath}/jcr:content`, payload, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Failed to update content fragment: ${fragmentPath}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const result = this.parseContentFragmentOperationResponse(response.data, fragmentPath);
            this.logger.debug('Successfully updated content fragment', {
                fragmentPath,
                elementCount: options.elements ? Object.keys(options.elements).length : 0
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
            this.logger.error('Failed to update content fragment', error, { fragmentPath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while updating content fragment: ${fragmentPath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, fragmentPath });
        }
    }
    /**
     * Delete content fragment with safety checks
     */
    async deleteContentFragment(fragmentPath, options = {}) {
        try {
            this.logger.debug('Deleting content fragment', { fragmentPath, options });
            if (!fragmentPath) {
                throw new errors_js_1.AEMException('Fragment path is required', 'VALIDATION_ERROR', false);
            }
            // Validate fragment path is in DAM
            if (!fragmentPath.startsWith('/content/dam/')) {
                throw new errors_js_1.AEMException('Content fragment path must be in DAM (/content/dam/)', 'VALIDATION_ERROR', false);
            }
            // Safety check: prevent deletion of important fragments
            if (this.isSystemFragment(fragmentPath)) {
                throw new errors_js_1.AEMException(`Cannot delete system content fragment: ${fragmentPath}`, 'VALIDATION_ERROR', false, undefined, { fragmentPath });
            }
            const params = {};
            if (options.force !== undefined) {
                params.force = options.force.toString();
            }
            if (options.checkReferences !== undefined) {
                params.checkReferences = options.checkReferences.toString();
            }
            const requestOptions = {
                context: {
                    operation: 'deleteContentFragment',
                    resource: fragmentPath
                }
            };
            const response = await this.client.delete(`/api/assets${fragmentPath}`, params, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Failed to delete content fragment: ${fragmentPath}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const result = this.parseContentFragmentOperationResponse(response.data, fragmentPath);
            this.logger.debug('Successfully deleted content fragment', {
                fragmentPath,
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
            this.logger.error('Failed to delete content fragment', error, { fragmentPath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while deleting content fragment: ${fragmentPath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, fragmentPath });
        }
    }
    /**
     * Parse content fragment operation response
     */
    parseContentFragmentOperationResponse(data, path) {
        return {
            success: Boolean(data.success !== false),
            path: data.path || path,
            message: data.message || data.msg,
            warnings: Array.isArray(data.warnings) ? data.warnings : (data.warning ? [data.warning] : []),
            errors: Array.isArray(data.errors) ? data.errors : (data.error ? [data.error] : [])
        };
    }
    /**
     * Format fragment elements for storage
     */
    formatFragmentElements(elements) {
        const formattedElements = {};
        for (const [key, value] of Object.entries(elements)) {
            if (value !== null && value !== undefined) {
                // Handle different element types
                if (typeof value === 'string') {
                    formattedElements[key] = {
                        'jcr:primaryType': 'nt:unstructured',
                        'value': value,
                        'dataType': 'string'
                    };
                }
                else if (typeof value === 'number') {
                    formattedElements[key] = {
                        'jcr:primaryType': 'nt:unstructured',
                        'value': value.toString(),
                        'dataType': 'number'
                    };
                }
                else if (typeof value === 'boolean') {
                    formattedElements[key] = {
                        'jcr:primaryType': 'nt:unstructured',
                        'value': value.toString(),
                        'dataType': 'boolean'
                    };
                }
                else if (Array.isArray(value)) {
                    formattedElements[key] = {
                        'jcr:primaryType': 'nt:unstructured',
                        'value': value,
                        'dataType': 'array'
                    };
                }
                else if (typeof value === 'object') {
                    // Handle rich text or structured content
                    formattedElements[key] = {
                        'jcr:primaryType': 'nt:unstructured',
                        'value': JSON.stringify(value),
                        'dataType': 'json'
                    };
                }
                else {
                    formattedElements[key] = {
                        'jcr:primaryType': 'nt:unstructured',
                        'value': value.toString(),
                        'dataType': 'string'
                    };
                }
            }
        }
        return formattedElements;
    }
    /**
     * Validate fragment name
     */
    isValidFragmentName(fragmentName) {
        // Content fragment name restrictions
        const invalidChars = /[<>:"/\\|?*\[\]]/;
        const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
        return !invalidChars.test(fragmentName) &&
            !reservedNames.includes(fragmentName.toLowerCase()) &&
            fragmentName.length > 0 &&
            fragmentName.length <= 150 &&
            !fragmentName.startsWith('.') &&
            !fragmentName.endsWith('.');
    }
    /**
     * Check if fragment is a system fragment that should not be deleted
     */
    isSystemFragment(fragmentPath) {
        const systemFragmentPrefixes = [
            '/content/dam/system',
            '/content/dam/conf',
            '/content/dam/we-retail', // Example system fragments
            '/content/dam/wknd' // Example system fragments
        ];
        return systemFragmentPrefixes.some(prefix => fragmentPath.startsWith(prefix)) ||
            fragmentPath.split('/').length <= 4; // Protect root level fragments
    }
}
exports.ContentFragmentOperationsService = ContentFragmentOperationsService;
//# sourceMappingURL=content-fragment-operations-service.js.map